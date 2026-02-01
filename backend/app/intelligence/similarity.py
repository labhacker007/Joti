"""
Semantic Similarity Engine

Provides semantic similarity matching using embeddings:
- Generate embeddings from technical summaries
- Compute cosine similarity
- Efficient similarity search
- Cache embeddings for performance

Uses sentence-transformers for embedding generation.
For production, consider pgvector extension for efficient vector search.
"""

import hashlib
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.logging import logger
from app.models import Article
from app.models_agentic import ArticleEmbedding, ArticleSummary, SummaryType


class SemanticSimilarityEngine:
    """
    Handles semantic similarity computation using embeddings.
    
    Features:
    - Embedding generation from technical summaries
    - Cosine similarity calculation
    - Embedding caching
    - Batch similarity search
    """
    
    DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    DEFAULT_DIMENSION = 384
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self._model = None
    
    def _get_model(self):
        """Lazy load sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.DEFAULT_MODEL)
                logger.info("sentence_transformer_loaded", model=self.DEFAULT_MODEL)
            except ImportError:
                logger.warning("sentence_transformers_not_installed",
                             message="Install with: pip install sentence-transformers")
                raise ImportError("sentence-transformers library not installed")
        return self._model
    
    async def generate_embedding(
        self,
        article_id: int,
        force_regenerate: bool = False
    ) -> Optional[List[float]]:
        """
        Generate embedding for article's technical summary.
        
        Args:
            article_id: Article to generate embedding for
            force_regenerate: Regenerate even if embedding exists
        
        Returns:
            Embedding vector as list of floats
        """
        # Check if embedding already exists
        if not force_regenerate:
            existing = self.db.query(ArticleEmbedding).filter(
                ArticleEmbedding.article_id == article_id
            ).first()
            
            if existing:
                logger.debug("using_cached_embedding", article_id=article_id)
                return existing.embedding
        
        # Get technical summary
        summary = self.db.query(ArticleSummary).filter(
            ArticleSummary.article_id == article_id,
            ArticleSummary.summary_type == SummaryType.TECHNICAL.value,
            ArticleSummary.is_current == True
        ).first()
        
        if not summary or not summary.content:
            logger.warning("no_technical_summary", article_id=article_id)
            return None
        
        # Generate embedding
        start_time = datetime.utcnow()
        
        try:
            model = self._get_model()
            embedding_array = model.encode(summary.content, convert_to_numpy=True)
            embedding_list = embedding_array.tolist()
            
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Compute hash of source text
            source_hash = hashlib.sha256(summary.content.encode()).hexdigest()
            
            # Store embedding
            existing = self.db.query(ArticleEmbedding).filter(
                ArticleEmbedding.article_id == article_id
            ).first()
            
            if existing:
                existing.embedding = embedding_list
                existing.embedding_model = self.DEFAULT_MODEL
                existing.embedding_dimension = len(embedding_list)
                existing.source_hash = source_hash
                existing.generation_time_ms = duration_ms
                existing.updated_at = datetime.utcnow()
            else:
                embedding_obj = ArticleEmbedding(
                    article_id=article_id,
                    embedding=embedding_list,
                    embedding_model=self.DEFAULT_MODEL,
                    embedding_dimension=len(embedding_list),
                    source_text="technical_summary",
                    source_hash=source_hash,
                    token_count=len(summary.content.split()),
                    generation_time_ms=duration_ms,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(embedding_obj)
            
            self.db.commit()
            
            logger.info("embedding_generated",
                       article_id=article_id,
                       dimension=len(embedding_list),
                       duration_ms=duration_ms)
            
            return embedding_list
            
        except Exception as e:
            logger.error("embedding_generation_failed",
                        article_id=article_id,
                        error=str(e))
            return None
    
    async def compute_similarity(
        self,
        article_id_1: int,
        article_id_2: int
    ) -> Optional[float]:
        """
        Compute cosine similarity between two articles.
        
        Returns:
            Similarity score (0.0-1.0) or None if embeddings unavailable
        """
        # Get embeddings
        embedding1 = await self.generate_embedding(article_id_1)
        embedding2 = await self.generate_embedding(article_id_2)
        
        if not embedding1 or not embedding2:
            return None
        
        # Compute cosine similarity
        similarity = self._cosine_similarity(embedding1, embedding2)
        
        return similarity
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Compute cosine similarity between two vectors.
        
        Formula: cos(θ) = (A · B) / (||A|| × ||B||)
        """
        # Convert to numpy arrays
        a = np.array(vec1)
        b = np.array(vec2)
        
        # Compute dot product
        dot_product = np.dot(a, b)
        
        # Compute magnitudes
        magnitude_a = np.linalg.norm(a)
        magnitude_b = np.linalg.norm(b)
        
        # Avoid division by zero
        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0
        
        # Compute cosine similarity
        similarity = dot_product / (magnitude_a * magnitude_b)
        
        # Clamp to [0, 1] range
        return max(0.0, min(1.0, float(similarity)))
    
    async def find_similar_articles(
        self,
        article_id: int,
        threshold: float = 0.75,
        limit: int = 10,
        lookback_days: Optional[int] = None
    ) -> List[Dict]:
        """
        Find semantically similar articles.
        
        Args:
            article_id: Source article
            threshold: Minimum similarity score (0.0-1.0)
            limit: Maximum results to return
            lookback_days: Optional time window
        
        Returns:
            List of similar articles with scores
        """
        # Get source embedding
        source_embedding = await self.generate_embedding(article_id)
        if not source_embedding:
            logger.warning("no_embedding_for_source", article_id=article_id)
            return []
        
        # Get candidate articles
        query = self.db.query(ArticleEmbedding).filter(
            ArticleEmbedding.article_id != article_id
        )
        
        if lookback_days:
            lookback_date = datetime.utcnow() - timedelta(days=lookback_days)
            query = query.join(Article).filter(
                Article.created_at >= lookback_date
            )
        
        candidates = query.all()
        
        # Compute similarities
        similarities = []
        for candidate in candidates:
            similarity = self._cosine_similarity(source_embedding, candidate.embedding)
            
            if similarity >= threshold:
                similarities.append({
                    "article_id": candidate.article_id,
                    "similarity_score": similarity
                })
        
        # Sort by similarity and limit
        similarities.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        return similarities[:limit]
    
    async def batch_generate_embeddings(
        self,
        article_ids: List[int],
        force_regenerate: bool = False
    ) -> Dict:
        """
        Generate embeddings for multiple articles in batch.
        
        More efficient than generating one at a time.
        """
        results = []
        errors = []
        
        for article_id in article_ids:
            try:
                embedding = await self.generate_embedding(article_id, force_regenerate)
                if embedding:
                    results.append(article_id)
            except Exception as e:
                logger.error("batch_embedding_failed",
                           article_id=article_id,
                           error=str(e))
                errors.append({
                    "article_id": article_id,
                    "error": str(e)
                })
        
        return {
            "successful": len(results),
            "failed": len(errors),
            "article_ids": results,
            "errors": errors
        }
    
    def get_embedding_statistics(self) -> Dict:
        """Get statistics about embeddings in the system."""
        total_embeddings = self.db.query(ArticleEmbedding).count()
        
        # Get articles without embeddings
        articles_without_embeddings = self.db.query(Article).outerjoin(
            ArticleEmbedding
        ).filter(
            ArticleEmbedding.id == None
        ).count()
        
        # Average generation time
        avg_time = self.db.query(
            func.avg(ArticleEmbedding.generation_time_ms)
        ).scalar() or 0
        
        return {
            "total_embeddings": total_embeddings,
            "articles_without_embeddings": articles_without_embeddings,
            "average_generation_time_ms": int(avg_time),
            "embedding_model": self.DEFAULT_MODEL,
            "embedding_dimension": self.DEFAULT_DIMENSION
        }
