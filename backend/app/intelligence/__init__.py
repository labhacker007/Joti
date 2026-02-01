"""
Agentic Intelligence Module

This module provides the core agentic intelligence capabilities:
- Automatic article analysis
- Entity extraction and canonicalization
- Historical association and campaign detection
- Semantic similarity matching
- Full traceability and lineage
"""

from app.intelligence.orchestrator import AgenticIntelligenceOrchestrator
from app.intelligence.canonicalizer import EntityCanonicalizer
from app.intelligence.association import HistoricalAssociationEngine
from app.intelligence.similarity import SemanticSimilarityEngine

__all__ = [
    "AgenticIntelligenceOrchestrator",
    "EntityCanonicalizer",
    "HistoricalAssociationEngine",
    "SemanticSimilarityEngine",
]
