"""
Duplicate Article Detection Guardrail
Uses GenAI to detect duplicate/similar articles at ingestion time.
"""
import structlog
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

logger = structlog.get_logger()


class DuplicateType:
    """Types of duplicates detected."""
    EXACT_DUPLICATE = "exact_duplicate"  # Same article from different source
    SIMILAR_CONTENT = "similar_content"  # Similar but not exact
    OUTDATED = "outdated"  # Old article re-published
    NOT_DUPLICATE = "not_duplicate"


class DuplicateDetectionResult:
    """Result of duplicate detection."""
    
    def __init__(
        self,
        is_duplicate: bool,
        duplicate_type: str,
        confidence: float,
        similar_articles: List[Dict],
        reasoning: str,
        matched_iocs: List[str] = None
    ):
        self.is_duplicate = is_duplicate
        self.duplicate_type = duplicate_type
        self.confidence = confidence
        self.similar_articles = similar_articles
        self.reasoning = reasoning
        self.matched_iocs = matched_iocs or []


class DuplicateDetectorGuardrail:
    """
    GenAI-powered duplicate detection guardrail.
    
    Features:
    - Analyzes content at ingestion time
    - Searches last 3 days of articles
    - Compares major content (IOCs, key facts)
    - Distinguishes duplicates vs outdated articles
    - Provides confidence scores and reasoning
    """
    
    def __init__(
        self,
        db: Session,
        genai_provider: GenAIProvider,
        lookback_days: int = 3,
        duplicate_window_hours: int = 24,
        confidence_threshold: float = 0.7
    ):
        self.db = db
        self.genai = genai_provider
        self.lookback_days = lookback_days
        self.duplicate_window_hours = duplicate_window_hours
        self.confidence_threshold = confidence_threshold
        self.logger = logger.bind(component="duplicate_detector")
    
    async def check_for_duplicates(
        self,
        title: str,
        content: str,
        summary: Optional[str],
        published_at: Optional[datetime],
        source_id: Optional[int] = None
    ) -> DuplicateDetectionResult:
        """
        Check if an article is a duplicate of existing articles.
        
        Process:
        1. Find similar articles from last N days
        2. Extract key facts and IOCs from new article
        3. Compare with similar articles using GenAI
        4. Determine if duplicate/similar/outdated
        5. Return detailed result with reasoning
        """
        try:
            self.logger.info(
                "checking_for_duplicates",
                title=title[:100],
                lookback_days=self.lookback_days
            )
            
            # Step 1: Find potentially similar articles
            similar_articles = self._find_similar_articles(
                title=title,
                published_at=published_at or datetime.utcnow(),
                source_id=source_id
            )
            
            if not similar_articles:
                self.logger.info("no_similar_articles_found")
                return DuplicateDetectionResult(
                    is_duplicate=False,
                    duplicate_type=DuplicateType.NOT_DUPLICATE,
                    confidence=1.0,
                    similar_articles=[],
                    reasoning="No similar articles found in the lookback window."
                )
            
            self.logger.info(
                "found_similar_articles",
                count=len(similar_articles)
            )
            
            # Step 2: Extract key facts from new article
            new_article_facts = await self._extract_key_facts(
                title=title,
                content=content,
                summary=summary
            )
            
            # Step 3: Compare with each similar article
            comparisons = []
            for similar in similar_articles:
                comparison = await self._compare_articles(
                    new_article={
                        "title": title,
                        "content": content,
                        "summary": summary,
                        "published_at": published_at,
                        "facts": new_article_facts
                    },
                    existing_article=similar
                )
                comparisons.append(comparison)
            
            # Step 4: Determine final result
            result = self._determine_duplicate_status(
                comparisons=comparisons,
                published_at=published_at or datetime.utcnow()
            )
            
            self.logger.info(
                "duplicate_detection_complete",
                is_duplicate=result.is_duplicate,
                duplicate_type=result.duplicate_type,
                confidence=result.confidence
            )
            
            return result
            
        except Exception as e:
            self.logger.error(
                "duplicate_detection_failed",
                error=str(e),
                exc_info=True
            )
            # On error, default to not duplicate to avoid blocking ingestion
            return DuplicateDetectionResult(
                is_duplicate=False,
                duplicate_type=DuplicateType.NOT_DUPLICATE,
                confidence=0.0,
                similar_articles=[],
                reasoning=f"Error during duplicate detection: {str(e)}"
            )
    
    def _find_similar_articles(
        self,
        title: str,
        published_at: datetime,
        source_id: Optional[int]
    ) -> List[Dict]:
        """Find articles with similar titles from recent days."""
        try:
            # Calculate lookback window
            cutoff_date = published_at - timedelta(days=self.lookback_days)
            
            # Extract key words from title for similarity matching
            title_words = set(title.lower().split())
            # Remove common words
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
            key_words = title_words - stop_words
            
            if not key_words:
                return []
            
            # Query articles
            query = self.db.query(Article).filter(
                and_(
                    Article.created_at >= cutoff_date,
                    Article.status != ArticleStatus.DELETED
                )
            )
            
            # Exclude same source to avoid duplicates from same feed
            if source_id:
                query = query.filter(Article.source_id != source_id)
            
            all_articles = query.all()
            
            # Filter by title similarity (simple keyword matching)
            similar = []
            for article in all_articles:
                if not article.title:
                    continue
                
                article_words = set(article.title.lower().split()) - stop_words
                
                # Calculate simple similarity (Jaccard)
                if key_words and article_words:
                    intersection = len(key_words & article_words)
                    union = len(key_words | article_words)
                    similarity = intersection / union if union > 0 else 0
                    
                    # If similarity > 30%, consider it potentially similar
                    if similarity > 0.3:
                        # Get IOCs for this article
                        iocs = self.db.query(ExtractedIntelligence).filter(
                            and_(
                                ExtractedIntelligence.article_id == article.id,
                                ExtractedIntelligence.intelligence_type.in_([
                                    'ip_address', 'domain', 'url', 'hash', 'email'
                                ])
                            )
                        ).all()
                        
                        similar.append({
                            "id": article.id,
                            "title": article.title,
                            "summary": article.summary,
                            "content": article.normalized_content,
                            "published_at": article.published_at or article.created_at,
                            "source_name": article.source_name,
                            "iocs": [{"type": ioc.intelligence_type, "value": ioc.value} for ioc in iocs],
                            "similarity_score": similarity
                        })
            
            # Sort by similarity
            similar.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            # Return top 5 most similar
            return similar[:5]
            
        except Exception as e:
            self.logger.error("failed_to_find_similar_articles", error=str(e))
            return []
    
    async def _extract_key_facts(
        self,
        title: str,
        content: str,
        summary: Optional[str]
    ) -> Dict:
        """Extract key facts from article using GenAI."""
        try:
            prompt = f"""Analyze this article and extract key facts for duplicate detection.

Article Title: {title}

Article Summary: {summary or 'N/A'}

Article Content: {content[:2000]}...

Extract:
1. Main topic/subject (1-2 sentences)
2. Key events or developments
3. Key entities (organizations, people, technologies)
4. Temporal context (when did this happen?)
5. IOCs or technical indicators (IPs, domains, hashes, etc.)

Return as structured JSON with keys: topic, events, entities, temporal_context, iocs"""

            response = await self.genai.generate_async(prompt, max_tokens=500)
            
            # Parse response
            import json
            try:
                facts = json.loads(response)
            except json.JSONDecodeError:
                # If not valid JSON, create structured response
                facts = {
                    "topic": response[:200],
                    "events": [],
                    "entities": [],
                    "temporal_context": "unknown",
                    "iocs": []
                }
            
            return facts
            
        except Exception as e:
            self.logger.error("failed_to_extract_facts", error=str(e))
            return {
                "topic": title,
                "events": [],
                "entities": [],
                "temporal_context": "unknown",
                "iocs": []
            }
    
    async def _compare_articles(
        self,
        new_article: Dict,
        existing_article: Dict
    ) -> Dict:
        """Compare two articles using GenAI to determine similarity."""
        try:
            prompt = f"""You are a duplicate detection expert. Compare these two articles and determine if they are duplicates.

NEW ARTICLE:
Title: {new_article['title']}
Summary: {new_article.get('summary', 'N/A')}
Published: {new_article.get('published_at', 'Unknown')}
Key Facts: {new_article.get('facts', {})}

EXISTING ARTICLE:
Title: {existing_article['title']}
Summary: {existing_article.get('summary', 'N/A')}
Published: {existing_article.get('published_at', 'Unknown')}
IOCs: {existing_article.get('iocs', [])}

Compare these articles and determine:
1. Are they about the SAME incident/topic? (yes/no)
2. Do they share major IOCs or technical details? (list shared IOCs)
3. Is the new article just a re-publication of old news? (yes/no/unclear)
4. Similarity type: exact_duplicate, similar_content, outdated, or not_duplicate
5. Confidence score (0.0-1.0)
6. Brief reasoning (1-2 sentences)

Return JSON: {{"same_topic": bool, "shared_iocs": [], "is_republication": bool, "similarity_type": str, "confidence": float, "reasoning": str}}"""

            response = await self.genai.generate_async(prompt, max_tokens=300)
            
            # Parse response
            import json
            try:
                comparison = json.loads(response)
            except json.JSONDecodeError:
                # Fallback to simple comparison
                comparison = {
                    "same_topic": False,
                    "shared_iocs": [],
                    "is_republication": False,
                    "similarity_type": DuplicateType.NOT_DUPLICATE,
                    "confidence": 0.5,
                    "reasoning": "Unable to parse GenAI response"
                }
            
            comparison["existing_article_id"] = existing_article["id"]
            comparison["existing_article_title"] = existing_article["title"]
            
            return comparison
            
        except Exception as e:
            self.logger.error("failed_to_compare_articles", error=str(e))
            return {
                "same_topic": False,
                "shared_iocs": [],
                "is_republication": False,
                "similarity_type": DuplicateType.NOT_DUPLICATE,
                "confidence": 0.0,
                "reasoning": f"Comparison failed: {str(e)}",
                "existing_article_id": existing_article["id"],
                "existing_article_title": existing_article["title"]
            }
    
    def _determine_duplicate_status(
        self,
        comparisons: List[Dict],
        published_at: datetime
    ) -> DuplicateDetectionResult:
        """Determine final duplicate status from all comparisons."""
        if not comparisons:
            return DuplicateDetectionResult(
                is_duplicate=False,
                duplicate_type=DuplicateType.NOT_DUPLICATE,
                confidence=1.0,
                similar_articles=[],
                reasoning="No comparisons performed."
            )
        
        # Find highest confidence match
        best_match = max(comparisons, key=lambda x: x.get("confidence", 0))
        
        # Check if confidence exceeds threshold
        if best_match["confidence"] >= self.confidence_threshold:
            # Check if within duplicate window (24 hours)
            existing_date = best_match.get("existing_article_date")
            if existing_date:
                time_diff = abs((published_at - existing_date).total_seconds() / 3600)
                is_within_window = time_diff <= self.duplicate_window_hours
            else:
                is_within_window = True
            
            # Determine type
            if best_match["similarity_type"] == DuplicateType.EXACT_DUPLICATE:
                duplicate_type = DuplicateType.EXACT_DUPLICATE
            elif best_match["is_republication"]:
                duplicate_type = DuplicateType.OUTDATED
            elif best_match["same_topic"] and is_within_window:
                duplicate_type = DuplicateType.SIMILAR_CONTENT
            else:
                duplicate_type = DuplicateType.NOT_DUPLICATE
            
            is_duplicate = duplicate_type != DuplicateType.NOT_DUPLICATE
            
            similar_articles = [{
                "id": comp["existing_article_id"],
                "title": comp["existing_article_title"],
                "confidence": comp["confidence"],
                "reasoning": comp["reasoning"]
            } for comp in comparisons if comp["confidence"] >= 0.5]
            
            return DuplicateDetectionResult(
                is_duplicate=is_duplicate,
                duplicate_type=duplicate_type,
                confidence=best_match["confidence"],
                similar_articles=similar_articles,
                reasoning=best_match["reasoning"],
                matched_iocs=best_match.get("shared_iocs", [])
            )
        else:
            return DuplicateDetectionResult(
                is_duplicate=False,
                duplicate_type=DuplicateType.NOT_DUPLICATE,
                confidence=best_match["confidence"],
                similar_articles=[],
                reasoning="Confidence below threshold for duplicate classification."
            )
