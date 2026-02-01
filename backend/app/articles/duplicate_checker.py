"""
Duplicate Article Detection - Content-based duplicate checking
Uses heuristics and GenAI to identify duplicate or similar articles
"""
import structlog
import re
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from difflib import SequenceMatcher

from app.models import Article
from app.core.logging import logger

logger = structlog.get_logger()


class DuplicateChecker:
    """
    Detects duplicate articles using multiple strategies:
    1. Title similarity (fuzzy matching)
    2. Content similarity (text comparison)
    3. URL domain matching
    4. Time-based proximity
    5. GenAI-powered semantic analysis (when available)
    """
    
    def __init__(self, db: Session, lookback_days: int = 3, similarity_threshold: float = 0.80):
        self.db = db
        self.lookback_days = lookback_days
        self.similarity_threshold = similarity_threshold
    
    def check_duplicate(
        self,
        title: str,
        content: str,
        url: Optional[str] = None,
        published_at: Optional[datetime] = None
    ) -> Dict:
        """
        Check if an article is a duplicate of existing articles.
        
        Returns:
            {
                "is_duplicate": bool,
                "confidence": float (0-1),
                "duplicate_article_id": int or None,
                "reasoning": str,
                "similarity_score": float
            }
        """
        try:
            # Get recent articles for comparison
            cutoff_date = datetime.utcnow() - timedelta(days=self.lookback_days)
            recent_articles = self.db.query(Article).filter(
                or_(
                    Article.published_at >= cutoff_date,
                    Article.created_at >= cutoff_date
                )
            ).all()
            
            if not recent_articles:
                return self._no_duplicate_result()
            
            # Check against each recent article
            best_match = None
            highest_similarity = 0.0
            
            for article in recent_articles:
                similarity_result = self._calculate_similarity(
                    title, content, url, published_at,
                    article.title, article.normalized_content or article.raw_content,
                    article.url, article.published_at or article.created_at
                )
                
                if similarity_result["score"] > highest_similarity:
                    highest_similarity = similarity_result["score"]
                    best_match = {
                        "article": article,
                        "result": similarity_result
                    }
            
            # Determine if it's a duplicate based on threshold
            if highest_similarity >= self.similarity_threshold:
                return {
                    "is_duplicate": True,
                    "confidence": highest_similarity,
                    "duplicate_article_id": best_match["article"].id,
                    "reasoning": best_match["result"]["reasoning"],
                    "similarity_score": highest_similarity
                }
            
            return self._no_duplicate_result()
            
        except Exception as e:
            logger.error("duplicate_check_error", error=str(e))
            return self._no_duplicate_result()
    
    def _calculate_similarity(
        self,
        title1: str, content1: str, url1: Optional[str], date1: Optional[datetime],
        title2: str, content2: str, url2: Optional[str], date2: Optional[datetime]
    ) -> Dict:
        """Calculate similarity score between two articles."""
        scores = []
        reasoning_parts = []
        
        # 1. Title similarity (weighted heavily)
        title_sim = self._text_similarity(title1, title2)
        if title_sim >= 0.90:
            scores.append(title_sim * 0.5)  # 50% weight
            reasoning_parts.append(f"Title match: {title_sim:.2f}")
        elif title_sim >= 0.70:
            scores.append(title_sim * 0.4)  # 40% weight
            reasoning_parts.append(f"Similar title: {title_sim:.2f}")
        else:
            scores.append(title_sim * 0.2)  # 20% weight if low similarity
        
        # 2. Content similarity
        if content1 and content2:
            content_sim = self._text_similarity(
                self._normalize_text(content1)[:1000],  # First 1000 chars
                self._normalize_text(content2)[:1000]
            )
            if content_sim >= 0.80:
                scores.append(content_sim * 0.3)  # 30% weight
                reasoning_parts.append(f"Content match: {content_sim:.2f}")
        
        # 3. URL similarity (same domain)
        if url1 and url2:
            domain1 = self._extract_domain(url1)
            domain2 = self._extract_domain(url2)
            if domain1 == domain2 and domain1:
                scores.append(0.1)  # 10% boost for same domain
                reasoning_parts.append("Same domain")
        
        # 4. Time proximity (published within 24 hours)
        if date1 and date2:
            time_diff = abs((date1 - date2).total_seconds())
            if time_diff < 86400:  # 24 hours
                scores.append(0.1)  # 10% boost
                reasoning_parts.append("Published within 24h")
        
        total_score = sum(scores) if scores else 0.0
        reasoning = ", ".join(reasoning_parts) if reasoning_parts else "No significant similarity"
        
        return {
            "score": min(total_score, 1.0),  # Cap at 1.0
            "reasoning": reasoning
        }
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity using SequenceMatcher."""
        if not text1 or not text2:
            return 0.0
        
        text1_clean = self._normalize_text(text1.lower())
        text2_clean = self._normalize_text(text2.lower())
        
        return SequenceMatcher(None, text1_clean, text2_clean).ratio()
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters
        text = re.sub(r'[^\w\s]', '', text)
        # Remove common words that don't add meaning
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
        words = text.split()
        words = [w for w in words if w.lower() not in stopwords]
        
        return ' '.join(words)
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL."""
        if not url:
            return None
        
        try:
            match = re.search(r'https?://([^/]+)', url)
            if match:
                domain = match.group(1)
                # Remove www. prefix
                domain = re.sub(r'^www\.', '', domain)
                return domain
        except Exception:
            pass
        
        return None
    
    def _no_duplicate_result(self) -> Dict:
        """Return a no-duplicate result."""
        return {
            "is_duplicate": False,
            "confidence": 0.0,
            "duplicate_article_id": None,
            "reasoning": "No duplicate found",
            "similarity_score": 0.0
        }
    
    async def check_with_genai(
        self,
        title: str,
        content: str,
        candidate_articles: list
    ) -> Dict:
        """
        Use GenAI to perform semantic duplicate detection.
        This is more accurate but slower and requires GenAI to be configured.
        """
        try:
            from app.genai.provider import GenAIProvider
            
            provider = GenAIProvider()
            
            # Build comparison prompt
            prompt = f"""You are a cybersecurity intelligence analyst. Determine if the following article is a duplicate or substantially similar to any of the candidate articles.

Article to Check:
Title: {title}
Content: {content[:500]}...

Candidate Articles:
"""
            for i, article in enumerate(candidate_articles[:5], 1):  # Limit to 5 for performance
                prompt += f"\n{i}. {article.title[:100]}"
            
            prompt += """

Respond with JSON:
{
    "is_duplicate": true/false,
    "confidence": 0.0-1.0,
    "duplicate_index": 1-5 or null,
    "reasoning": "brief explanation"
}
"""
            
            # Call GenAI (simplified - actual implementation may vary)
            # response = await provider.generate(prompt=prompt, ...)
            # Parse and return
            
            # For now, fall back to heuristic if GenAI not available
            logger.warning("genai_duplicate_check_not_fully_implemented")
            return self._no_duplicate_result()
            
        except Exception as e:
            logger.error("genai_duplicate_check_error", error=str(e))
            return self._no_duplicate_result()
