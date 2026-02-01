"""
Knowledge Base module for RAG-based GenAI operations.

This module provides document management and retrieval for:
- Product documentation (XSIAM, Defender, Splunk, etc.)
- Query syntax guides
- Threat intelligence references
- Custom user-uploaded documents
"""

from app.knowledge.service import KnowledgeService, get_knowledge_service
from app.knowledge.routes import router as knowledge_router

__all__ = ["KnowledgeService", "get_knowledge_service", "knowledge_router"]
