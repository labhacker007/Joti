from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger
import uuid


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to add correlation IDs and log HTTP requests."""
    
    async def dispatch(self, request: Request, call_next):
        # Generate or extract correlation ID
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id
        
        # Extract client IP
        client_ip = request.client.host if request.client else "unknown"
        request.state.client_ip = client_ip
        
        # Log request
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            correlation_id=correlation_id,
            client_ip=client_ip
        )
        
        response = await call_next(request)
        
        # Log response
        logger.info(
            "http_response",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            correlation_id=correlation_id
        )
        
        response.headers["X-Correlation-ID"] = correlation_id
        return response
