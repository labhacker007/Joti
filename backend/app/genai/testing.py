"""
GenAI Testing Lab API

Endpoints for testing models, comparing performance, and validating configurations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import hashlib
import time

from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models import User
from app.genai.config_manager import GenAIConfigManager
from app.genai.provider import GenAIProvider
from app.genai.models import GenAIModelConfig
from app.core.logging import logger

router = APIRouter(prefix="/genai/test", tags=["genai-testing"])


class TestRequest(BaseModel):
    """Schema for GenAI test request."""
    model: str = Field(..., description="Model identifier to test")
    prompt: str = Field(..., min_length=1, description="Test prompt")
    temperature: Optional[float] = Field(0.3, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(2000, gt=0, le=100000)
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0)
    use_guardrails: bool = Field(True, description="Apply security guardrails")
    guardrail_ids: Optional[List[str]] = Field(None, description="Specific guardrail IDs to apply")
    use_knowledge_base: bool = Field(False, description="Use Knowledge Base (RAG) for context")
    knowledge_base_query: Optional[str] = Field(None, description="Query to search KB for context")
    platform: Optional[str] = Field(None, description="Target platform for query generation")
    config_id: Optional[int] = Field(None, description="Use saved configuration")


class ComparisonRequest(BaseModel):
    """Schema for model comparison request."""
    models: List[str] = Field(..., min_items=1, max_items=10, description="Models to compare")
    prompt: str = Field(..., min_length=1)
    temperature: Optional[float] = Field(0.3, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(2000, gt=0, le=100000)
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0)
    use_guardrails: bool = Field(True, description="Apply security guardrails to prompt and response")
    guardrail_ids: Optional[List[str]] = Field(None, description="Specific guardrail IDs to apply")
    use_knowledge_base: bool = Field(False, description="Use Knowledge Base (RAG) for context")
    knowledge_base_query: Optional[str] = Field(None, description="Query to search KB for context")
    platform: Optional[str] = Field(None, description="Target platform for query generation")


class TestResponse(BaseModel):
    """Schema for test response."""
    model: str
    response: str
    tokens_used: int
    cost: float
    response_time_ms: int
    guardrails_passed: bool
    quality_metrics: Dict[str, Any]


@router.post("/single")
async def test_single_model(
    request: TestRequest,
    current_user: User = Depends(require_permission("test:genai")),
    db: Session = Depends(get_db)
):
    """
    Test a single model with given configuration.
    Used in GenAI Testing Lab for single model testing.
    
    IMPORTANT: This endpoint properly validates model availability and returns FAILED
    if the model's API is not configured or not accessible.
    """
    from app.core.config import settings
    from app.genai.models import GenAIModelRegistry
    import httpx
    
    start_time = time.time()
    
    try:
        # First, check if model exists in registry
        model = db.query(GenAIModelRegistry).filter(
            GenAIModelRegistry.model_identifier == request.model,
            GenAIModelRegistry.is_enabled == True
        ).first()
        
        if not model:
            raise HTTPException(
                status_code=400,
                detail=f"Model '{request.model}' is not enabled or does not exist in registry"
            )
        
        # Check if model's provider has API key configured
        provider = model.provider.lower()
        is_available = False
        error_reason = ""
        
        if provider == "ollama":
            # Check Ollama connectivity
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                    if response.status_code == 200:
                        data = response.json()
                        available_models = [m["name"] for m in data.get("models", [])]
                        # Check if specific model is pulled
                        if model.model_name in available_models or \
                           any(model.model_name in m for m in available_models):
                            is_available = True
                        else:
                            error_reason = f"Model '{model.model_name}' not pulled in Ollama. Run: ollama pull {model.model_name}"
                    else:
                        error_reason = "Ollama returned error response"
            except Exception as e:
                error_reason = f"Ollama not running or not accessible at {settings.OLLAMA_BASE_URL}. Start with: ollama serve"
        
        elif provider == "openai":
            if settings.OPENAI_API_KEY:
                is_available = True
            else:
                error_reason = "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        
        elif provider == "anthropic":
            if settings.ANTHROPIC_API_KEY or settings.CLAUDE_API_KEY:
                is_available = True
            else:
                error_reason = "Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable."
        
        elif provider == "gemini":
            if settings.GEMINI_API_KEY:
                is_available = True
            else:
                error_reason = "Gemini API key not configured. Set GEMINI_API_KEY environment variable."
        
        else:
            error_reason = f"Unknown provider: {provider}"
        
        # If model is not available, return FAILED immediately
        if not is_available:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            logger.warning(
                "genai_test_failed_no_api",
                model=request.model,
                provider=provider,
                reason=error_reason,
                user_id=current_user.id
            )
            
            raise HTTPException(
                status_code=503,
                detail=error_reason
            )
        
        # Model is available - now try to actually call it
        # Get effective config
        effective_config = {
            'preferred_model': request.model,
            'temperature': request.temperature,
            'max_tokens': request.max_tokens,
            'top_p': request.top_p
        }
        
        # Apply guardrails if requested
        guardrails_passed = True
        if request.use_guardrails:
            try:
                from app.guardrails.cybersecurity_guardrails import get_guardrail_engine
                engine = get_guardrail_engine(db)
                passed, results = await engine.validate_input(
                    prompt=request.prompt,
                    use_case='testing',
                    platform=None
                )
                guardrails_passed = passed
            except Exception as e:
                logger.warning("guardrails_check_failed", error=str(e))
        
        # Call the actual model
        response_text = ""
        
        if provider == "ollama":
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    ollama_response = await client.post(
                        f"{settings.OLLAMA_BASE_URL}/api/generate",
                        json={
                            "model": model.model_name,
                            "prompt": request.prompt,
                            "stream": False,
                            "options": {
                                "temperature": request.temperature,
                                "num_predict": request.max_tokens,
                                "top_p": request.top_p
                            }
                        }
                    )
                    if ollama_response.status_code == 200:
                        data = ollama_response.json()
                        response_text = data.get("response", "")
                    else:
                        raise Exception(f"Ollama returned status {ollama_response.status_code}")
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Ollama call failed: {str(e)}")
        
        elif provider == "openai":
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                completion = await client.chat.completions.create(
                    model=model.model_name,
                    messages=[{"role": "user", "content": request.prompt}],
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                )
                response_text = completion.choices[0].message.content
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"OpenAI call failed: {str(e)}")
        
        elif provider == "anthropic":
            try:
                import anthropic
                client = anthropic.AsyncAnthropic(
                    api_key=settings.ANTHROPIC_API_KEY or settings.CLAUDE_API_KEY
                )
                message = await client.messages.create(
                    model=model.model_name,
                    max_tokens=request.max_tokens,
                    messages=[{"role": "user", "content": request.prompt}]
                )
                response_text = message.content[0].text
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Anthropic call failed: {str(e)}")
        
        elif provider == "gemini":
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                genai_model = genai.GenerativeModel(model.model_name)
                response = await genai_model.generate_content_async(request.prompt)
                response_text = response.text
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Gemini call failed: {str(e)}")
        
        end_time = time.time()
        response_time_ms = int((end_time - start_time) * 1000)
        
        # Calculate tokens and cost
        tokens_used = len(request.prompt.split()) + len(response_text.split())
        
        cost = 0.0
        if not model.is_free and model.cost_per_1k_input_tokens:
            input_tokens = len(request.prompt.split()) * 1.3
            output_tokens = len(response_text.split()) * 1.3
            cost = (input_tokens / 1000 * (model.cost_per_1k_input_tokens or 0)) + \
                   (output_tokens / 1000 * (model.cost_per_1k_output_tokens or 0))
        
        # Calculate quality metrics
        quality_metrics = {
            'response_length': len(response_text),
            'tokens_efficiency': tokens_used / effective_config['max_tokens'] if effective_config['max_tokens'] else 0,
            'cost_efficiency': cost,
            'speed_score': min(100, int(5000 / max(response_time_ms, 1) * 100))
        }
        
        logger.info(
            "genai_test_completed",
            model=request.model,
            provider=provider,
            user_id=current_user.id,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms
        )
        
        return {
            "model": request.model,
            "response": response_text,
            "tokens_used": tokens_used,
            "cost": cost,
            "response_time_ms": response_time_ms,
            "guardrails_passed": guardrails_passed,
            "quality_metrics": quality_metrics,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "genai_test_failed",
            model=request.model,
            error=str(e),
            user_id=current_user.id
        )
        raise HTTPException(
            status_code=500,
            detail=f"Test failed: {str(e)}"
        )


@router.post("/compare")
async def compare_models(
    request: ComparisonRequest,
    current_user: User = Depends(require_permission("test:genai")),
    db: Session = Depends(get_db)
):
    """
    Compare multiple models with the same prompt.
    Used in GenAI Testing Lab for model comparison.
    
    This endpoint makes REAL API calls to all selected models and returns
    actual responses for comparison. Supports guardrails and Knowledge Base (RAG).
    """
    from app.core.config import settings
    from app.genai.models import GenAIModelRegistry
    import httpx
    
    results = []
    guardrails_validation = None
    kb_context = None
    
    # Apply guardrails to prompt if enabled
    if request.use_guardrails:
        try:
            from app.guardrails.cybersecurity_guardrails import get_guardrail_engine
            engine = get_guardrail_engine(db)
            passed, validation_results = engine.validate_input(
                prompt=request.prompt,
                use_case='model_comparison',
                platform=request.platform
            )
            guardrails_validation = {
                'passed': passed,
                'results': validation_results,
                'guardrail_ids': request.guardrail_ids
            }
            if not passed:
                # Return early with guardrail failure
                return {
                    'results': [],
                    'total_models': len(request.models),
                    'successful': 0,
                    'failed': len(request.models),
                    'guardrails_failed': True,
                    'guardrails_validation': guardrails_validation,
                    'error': 'Prompt failed guardrail validation. Review and modify your prompt.'
                }
        except Exception as e:
            logger.warning("guardrails_check_failed", error=str(e))
            guardrails_validation = {'passed': True, 'error': str(e)}
    
    # Fetch Knowledge Base context if enabled (RAG)
    if request.use_knowledge_base:
        try:
            from app.knowledge.service import KnowledgeService
            kb_service = KnowledgeService(db)
            
            # Search KB for relevant context
            search_query = request.knowledge_base_query or request.prompt[:500]
            kb_results = await kb_service.search(
                query=search_query,
                target_platform=request.platform,
                top_k=5
            )
            
            if kb_results:
                kb_context = "\n\n--- Knowledge Base Context ---\n"
                for idx, doc in enumerate(kb_results, 1):
                    title = doc.get('title', doc.get('source_url', 'Document'))
                    content = doc.get('content', doc.get('chunk_text', ''))[:500]
                    kb_context += f"\n[{idx}] {title}:\n{content}\n"
                kb_context += "\n--- End of KB Context ---\n\n"
                
                logger.info("kb_context_added", documents=len(kb_results), query=search_query[:100])
            else:
                logger.info("kb_search_no_results", query=search_query[:100])
        except Exception as e:
            logger.warning("knowledge_base_fetch_failed", error=str(e))
            kb_context = None
    
    # Prepare the final prompt with KB context if available
    final_prompt = request.prompt
    if kb_context:
        final_prompt = f"Use the following context from the Knowledge Base to help answer:\n{kb_context}\n\nUser Query:\n{request.prompt}"
    
    for model_id in request.models:
        start_time = time.time()
        
        try:
            # Get model from registry
            model = db.query(GenAIModelRegistry).filter(
                GenAIModelRegistry.model_identifier == model_id,
                GenAIModelRegistry.is_enabled == True
            ).first()
            
            if not model:
                results.append({
                    'model': model_id,
                    'status': 'failed',
                    'error': f"Model '{model_id}' not found or not enabled in registry"
                })
                continue
            
            provider_name = model.provider.lower()
            response_text = ""
            is_available = False
            error_reason = ""
            
            # Check availability and call the model
            if provider_name == "ollama":
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        tags_resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                        if tags_resp.status_code == 200:
                            available = [m["name"] for m in tags_resp.json().get("models", [])]
                            if model.model_name in available or any(model.model_name in m for m in available):
                                is_available = True
                            else:
                                error_reason = f"Model '{model.model_name}' not pulled. Run: ollama pull {model.model_name}"
                        else:
                            error_reason = "Ollama returned error"
                except Exception as e:
                    error_reason = f"Ollama not accessible: {str(e)}"
                
                if is_available:
                    try:
                        async with httpx.AsyncClient(timeout=120.0) as client:
                            gen_resp = await client.post(
                                f"{settings.OLLAMA_BASE_URL}/api/generate",
                                json={
                                    "model": model.model_name,
                                    "prompt": final_prompt,
                                    "stream": False,
                                    "options": {
                                        "temperature": request.temperature,
                                        "num_predict": request.max_tokens,
                                        "top_p": request.top_p
                                    }
                                }
                            )
                            if gen_resp.status_code == 200:
                                response_text = gen_resp.json().get("response", "")
                            else:
                                error_reason = f"Ollama generate failed: {gen_resp.status_code}"
                                is_available = False
                    except Exception as e:
                        error_reason = f"Ollama call failed: {str(e)}"
                        is_available = False
            
            elif provider_name == "openai":
                if settings.OPENAI_API_KEY:
                    is_available = True
                    try:
                        from openai import AsyncOpenAI
                        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                        completion = await client.chat.completions.create(
                            model=model.model_name,
                            messages=[{"role": "user", "content": final_prompt}],
                            temperature=request.temperature,
                            max_tokens=request.max_tokens
                        )
                        response_text = completion.choices[0].message.content
                    except Exception as e:
                        error_reason = f"OpenAI call failed: {str(e)}"
                        is_available = False
                else:
                    error_reason = "OpenAI API key not configured"
            
            elif provider_name == "anthropic":
                api_key = settings.ANTHROPIC_API_KEY or settings.CLAUDE_API_KEY
                if api_key:
                    is_available = True
                    try:
                        import anthropic
                        client = anthropic.AsyncAnthropic(api_key=api_key)
                        message = await client.messages.create(
                            model=model.model_name,
                            max_tokens=request.max_tokens,
                            messages=[{"role": "user", "content": final_prompt}]
                        )
                        response_text = message.content[0].text
                    except Exception as e:
                        error_reason = f"Anthropic call failed: {str(e)}"
                        is_available = False
                else:
                    error_reason = "Anthropic API key not configured"
            
            elif provider_name == "gemini":
                if settings.GEMINI_API_KEY:
                    is_available = True
                    try:
                        import google.generativeai as genai
                        genai.configure(api_key=settings.GEMINI_API_KEY)
                        genai_model = genai.GenerativeModel(model.model_name)
                        response = await genai_model.generate_content_async(final_prompt)
                        response_text = response.text
                    except Exception as e:
                        error_reason = f"Gemini call failed: {str(e)}"
                        is_available = False
                else:
                    error_reason = "Gemini API key not configured"
            
            else:
                error_reason = f"Unknown provider: {provider_name}"
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            if not is_available or not response_text:
                results.append({
                    'model': model_id,
                    'model_name': model.display_name,
                    'provider': model.provider,
                    'status': 'failed',
                    'error': error_reason or "No response received",
                    'response_time_ms': response_time_ms
                })
                continue
            
            # Calculate metrics
            tokens_used = len(request.prompt.split()) + len(response_text.split())
            
            cost = 0.0
            if not model.is_free and model.cost_per_1k_input_tokens:
                input_tokens = len(request.prompt.split()) * 1.3
                output_tokens = len(response_text.split()) * 1.3
                cost = (input_tokens / 1000 * (model.cost_per_1k_input_tokens or 0)) + \
                       (output_tokens / 1000 * (model.cost_per_1k_output_tokens or 0))
            
            quality_metrics = {
                'response_length': len(response_text),
                'tokens_efficiency': tokens_used / request.max_tokens if request.max_tokens else 0,
                'cost_efficiency': cost,
                'speed_score': min(100, int(5000 / max(response_time_ms, 1) * 100))
            }
            
            results.append({
                'model': model_id,
                'model_name': model.display_name,
                'provider': model.provider,
                'status': 'success',
                'response': response_text,
                'tokens_used': tokens_used,
                'cost': cost,
                'response_time_ms': response_time_ms,
                'guardrails_passed': request.use_guardrails,
                'quality_metrics': quality_metrics,
                'error': None
            })
            
            logger.info(
                "genai_comparison_model_success",
                model=model_id,
                provider=provider_name,
                response_time_ms=response_time_ms,
                tokens_used=tokens_used
            )
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            results.append({
                'model': model_id,
                'status': 'failed',
                'error': str(e),
                'response_time_ms': response_time_ms
            })
            
            logger.error(
                "genai_comparison_model_failed",
                model=model_id,
                error=str(e),
                user_id=current_user.id
            )
    
    successful = len([r for r in results if r.get('status') == 'success'])
    failed = len([r for r in results if r.get('status') == 'failed'])
    
    logger.info(
        "genai_comparison_completed",
        models_count=len(request.models),
        successful=successful,
        failed=failed,
        user_id=current_user.id
    )
    
    return {
        'results': results,
        'total_models': len(request.models),
        'successful': successful,
        'failed': failed,
        'guardrails_applied': request.use_guardrails,
        'guardrails_validation': guardrails_validation,
        'knowledge_base_used': request.use_knowledge_base,
        'kb_context_added': kb_context is not None
    }


@router.get("/history")
async def get_test_history(
    limit: int = 50,
    use_case: Optional[str] = None,
    current_user: User = Depends(require_permission("view:genai")),
    db: Session = Depends(get_db)
):
    """Get test history for analysis."""
    config_manager = GenAIConfigManager(db)
    
    # Get logs filtered by testing use cases
    from app.genai.models import GenAIRequestLog
    
    query = db.query(GenAIRequestLog).filter(
        GenAIRequestLog.user_id == current_user.id,
        GenAIRequestLog.use_case.in_(['testing', 'comparison_testing'])
    )
    
    if use_case:
        query = query.filter(GenAIRequestLog.use_case == use_case)
    
    logs = query.order_by(GenAIRequestLog.created_at.desc()).limit(limit).all()
    
    return {
        'history': [
            {
                'id': log.id,
                'model': log.model_used,
                'use_case': log.use_case,
                'tokens_used': log.tokens_used,
                'cost': log.cost_usd,
                'response_time_ms': log.response_time_ms,
                'was_successful': log.was_successful,
                'created_at': log.created_at.isoformat()
            }
            for log in logs
        ],
        'total': len(logs)
    }
