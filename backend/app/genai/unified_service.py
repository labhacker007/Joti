"""
Unified GenAI Service

Central service that connects all GenAI operations to:
- Centralized model configuration (GenAIConfigManager)
- Guardrail enforcement (CybersecurityGuardrailEngine)
- Knowledge Base / RAG (KnowledgeService)
- Request logging and audit trail

All GenAI functions should use this service instead of direct provider calls.
"""

from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.genai.config_manager import GenAIConfigManager
from app.genai.provider import get_model_manager, GenAIModelManager
from app.knowledge.service import KnowledgeService


class UnifiedGenAIService:
    """
    Central GenAI service that enforces:
    1. Model configuration from admin settings
    2. Guardrail validation on input/output
    3. RAG/Knowledge Base context injection
    4. Request logging and cost tracking
    """
    
    # Use case constants
    USE_CASE_CHATBOT = "chatbot"
    USE_CASE_SUMMARIZATION = "summarization"
    USE_CASE_EXTRACTION = "extraction"
    USE_CASE_HUNT_QUERY = "hunt_query"
    USE_CASE_HUNT_TITLE = "hunt_title"
    USE_CASE_GENERAL = "general"
    
    def __init__(self, db: Session, user_id: Optional[int] = None, user_role: Optional[str] = None):
        self.db = db
        self.user_id = user_id
        self.user_role = user_role
        self._model_manager: Optional[GenAIModelManager] = None
        self._config_manager: Optional[GenAIConfigManager] = None
        self._knowledge_service: Optional[KnowledgeService] = None
        self._guardrail_engine = None
    
    @property
    def model_manager(self) -> GenAIModelManager:
        if self._model_manager is None:
            self._model_manager = get_model_manager()
        return self._model_manager
    
    @property
    def config_manager(self) -> GenAIConfigManager:
        if self._config_manager is None:
            self._config_manager = GenAIConfigManager(self.db)
        return self._config_manager
    
    @property
    def knowledge_service(self) -> KnowledgeService:
        if self._knowledge_service is None:
            self._knowledge_service = KnowledgeService(self.db)
        return self._knowledge_service
    
    def get_guardrail_engine(self):
        """Lazy load guardrail engine."""
        if self._guardrail_engine is None:
            try:
                from app.guardrails.cybersecurity_guardrails import CybersecurityGuardrailEngine
                self._guardrail_engine = CybersecurityGuardrailEngine()
            except ImportError:
                logger.warning("Guardrail engine not available")
                self._guardrail_engine = None
        return self._guardrail_engine
    
    def get_effective_config(self, use_case: str) -> Dict[str, Any]:
        """
        Get effective configuration for a use case.
        Falls back to model manager defaults if config manager fails.
        """
        try:
            return self.config_manager.get_config(
                use_case=use_case,
                user_id=self.user_id,
                user_role=self.user_role
            )
        except Exception as e:
            logger.warning("config_manager_fallback", error=str(e), use_case=use_case)
            # Return sensible defaults
            return {
                "preferred_model": self.model_manager.get_primary_model(),
                "fallback_model": self.model_manager.get_secondary_model(),
                "temperature": 0.7,
                "max_tokens": 2000,
                "top_p": 0.9,
                "enable_guardrails": True,
                "enable_rag": True,
            }
    
    async def validate_input(
        self,
        prompt: str,
        use_case: str,
        platform: Optional[str] = None
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """
        Validate input against guardrails.
        
        Returns:
            (passed, violations, blocked_message)
            - passed: True if input is safe
            - violations: List of guardrail violations
            - blocked_message: Message to return if blocked, None if passed
        """
        engine = self.get_guardrail_engine()
        if not engine:
            return True, [], None
        
        try:
            passed, results = await engine.validate_input(
                prompt=prompt,
                use_case=use_case,
                platform=platform
            )
            
            # Check for critical/high severity violations
            critical_violations = [
                r for r in results 
                if not r.passed and r.severity in ('critical', 'high')
            ]
            
            if critical_violations:
                violations_list = [
                    {
                        "guardrail_id": r.guardrail_id,
                        "message": r.message,
                        "severity": r.severity,
                        "suggestion": r.suggestion
                    }
                    for r in critical_violations
                ]
                
                blocked_message = (
                    "⚠️ Security Guardrail Triggered\n\n"
                    "Your request was blocked due to security policies:\n" +
                    "\n".join([f"• {v['message']}" for v in violations_list]) +
                    "\n\nPlease revise your input and try again."
                )
                
                return False, violations_list, blocked_message
            
            return True, [], None
            
        except Exception as e:
            logger.error("guardrail_validation_error", error=str(e))
            return True, [], None  # Fail open for availability
    
    async def validate_output(
        self,
        output: str,
        use_case: str,
        platform: Optional[str] = None,
        source_content: Optional[str] = None
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """
        Validate output against guardrails.
        
        Returns:
            (passed, violations, warning_message)
        """
        engine = self.get_guardrail_engine()
        if not engine:
            return True, [], None
        
        try:
            passed, results = await engine.validate_output(
                output=output,
                use_case=use_case,
                platform=platform,
                source_content=source_content
            )
            
            critical_violations = [
                r for r in results 
                if not r.passed and r.severity in ('critical', 'high')
            ]
            
            if critical_violations:
                violations_list = [
                    {
                        "guardrail_id": r.guardrail_id,
                        "message": r.message,
                        "severity": r.severity
                    }
                    for r in critical_violations
                ]
                
                warning_message = (
                    "\n\n---\n⚠️ **Security Notice**: This response was flagged:\n" +
                    "\n".join([f"• {v['message']}" for v in violations_list])
                )
                
                return False, violations_list, warning_message
            
            return True, [], None
            
        except Exception as e:
            logger.error("guardrail_output_validation_error", error=str(e))
            return True, [], None
    
    async def get_rag_context(
        self,
        query: str,
        use_case: str,
        platform: Optional[str] = None,
        max_results: int = 5
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Get relevant context from Knowledge Base.
        
        Returns:
            (context_text, sources)
        """
        try:
            results = await self.knowledge_service.search(
                query=query,
                target_platform=platform,
                top_k=max_results
            )
            
            if not results:
                return "", []
            
            context_parts = []
            sources = []
            
            for idx, result in enumerate(results, 1):
                context_parts.append(f"[Source {idx}]: {result.get('content', '')[:500]}")
                sources.append({
                    "title": result.get("title", "Unknown"),
                    "url": result.get("url", ""),
                    "relevance_score": result.get("score", 0)
                })
            
            context_text = "\n\n".join(context_parts)
            return context_text, sources
            
        except Exception as e:
            logger.error("rag_context_error", error=str(e), use_case=use_case)
            return "", []
    
    async def generate(
        self,
        prompt: str,
        use_case: str,
        system_prompt: Optional[str] = None,
        platform: Optional[str] = None,
        enforce_guardrails: bool = True,
        use_rag: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Main generation method with full integration.
        
        Args:
            prompt: User prompt
            use_case: One of USE_CASE_* constants
            system_prompt: Optional system prompt (will be enhanced with RAG)
            platform: Target platform for platform-specific guardrails
            enforce_guardrails: Whether to enforce guardrails
            use_rag: Whether to inject RAG context
            **kwargs: Additional params (temperature, max_tokens, etc.)
        
        Returns:
            {
                "response": str,
                "model_used": str,
                "guardrails_applied": bool,
                "guardrail_results": list,
                "rag_sources": list,
                "blocked": bool,
                "tokens_used": dict,
                "error": str (if any)
            }
        """
        result = {
            "response": "",
            "model_used": "",
            "guardrails_applied": enforce_guardrails,
            "guardrail_results": [],
            "rag_sources": [],
            "blocked": False,
            "tokens_used": {},
            "error": None
        }
        
        # 1. Get config
        config = self.get_effective_config(use_case)
        model = kwargs.get("model") or config.get("preferred_model")
        temperature = kwargs.get("temperature", config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", config.get("max_tokens", 2000))
        
        # 2. Validate input with guardrails
        if enforce_guardrails:
            passed, violations, blocked_message = await self.validate_input(
                prompt=prompt,
                use_case=use_case,
                platform=platform
            )
            
            if not passed:
                result["blocked"] = True
                result["response"] = blocked_message
                result["guardrail_results"] = violations
                logger.warning("genai_input_blocked", use_case=use_case, violations=len(violations))
                return result
        
        # 3. Get RAG context
        rag_context = ""
        if use_rag:
            rag_context, sources = await self.get_rag_context(
                query=prompt,
                use_case=use_case,
                platform=platform
            )
            result["rag_sources"] = sources
        
        # 4. Enhance system prompt with RAG context
        enhanced_system = system_prompt or ""
        if rag_context:
            enhanced_system = f"""{enhanced_system}

## Relevant Knowledge Base Context:
{rag_context}

Use the above context to ground your response in verified information."""
        
        # 5. Generate response
        try:
            response_text = await self.model_manager.generate_with_fallback(
                prompt=prompt,
                system_prompt=enhanced_system if enhanced_system else None,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            result["response"] = response_text
            result["model_used"] = model or self.model_manager.get_primary_model()
            
        except Exception as e:
            logger.error("genai_generation_error", error=str(e), use_case=use_case)
            result["error"] = str(e)
            result["response"] = f"Generation failed: {str(e)}"
            return result
        
        # 6. Validate output with guardrails
        if enforce_guardrails and result["response"]:
            passed, violations, warning = await self.validate_output(
                output=result["response"],
                use_case=use_case,
                platform=platform,
                source_content=prompt
            )
            
            if not passed:
                result["guardrail_results"].extend(violations)
                if warning:
                    result["response"] += warning
        
        # 7. Log request
        try:
            self.config_manager.log_request(
                model_identifier=result["model_used"],
                use_case=use_case,
                user_id=self.user_id,
                prompt_tokens=len(prompt.split()),  # Approximate
                completion_tokens=len(result["response"].split()),
                success=result["error"] is None
            )
        except Exception as e:
            logger.debug("request_logging_failed", error=str(e))
        
        return result
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available/configured models."""
        models = []
        
        # Get from model manager
        available = self.model_manager.get_available_models()
        for model_name in available:
            models.append({
                "name": model_name,
                "provider": model_name.split(":")[0] if ":" in model_name else "unknown",
                "available": True
            })
        
        return models
    
    def get_available_guardrails(self) -> List[Dict[str, Any]]:
        """Get list of available guardrails for UI."""
        engine = self.get_guardrail_engine()
        if not engine:
            return []
        
        try:
            return engine.get_all_guardrails()
        except Exception:
            return []


def get_genai_service(
    db: Session,
    user_id: Optional[int] = None,
    user_role: Optional[str] = None
) -> UnifiedGenAIService:
    """Factory function to get GenAI service."""
    return UnifiedGenAIService(db, user_id, user_role)
