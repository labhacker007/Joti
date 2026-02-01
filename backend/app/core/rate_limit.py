"""Rate limiting middleware and utilities using in-memory storage.

For production, consider using Redis-based rate limiting with slowapi or similar.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from functools import wraps
import asyncio
import threading

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.logging import logger
from app.core.config import settings


class RateLimiter:
    """In-memory rate limiter with sliding window algorithm.
    
    For production use with multiple workers, use Redis-based solution.
    """
    
    def __init__(self):
        # Storage: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()
        
        # Default limits (requests per window)
        self.default_limit = 100
        self.default_window = 60  # seconds
        
        # Endpoint-specific limits
        self.endpoint_limits = {
            # Auth endpoints - stricter limits
            "/auth/login": (5, 60),          # 5 requests per minute
            "/auth/register": (3, 60),        # 3 requests per minute
            "/auth/saml/login": (10, 60),     # 10 requests per minute
            
            # GenAI endpoints - expensive operations
            "/hunts/generate": (20, 60),      # 20 requests per minute
            "/hunts/batch": (5, 60),          # 5 batch operations per minute
            "/automation/process": (10, 60),  # 10 processes per minute
            
            # Ingestion - resource intensive
            "/sources/ingest-all": (2, 60),   # 2 per minute
            
            # Reports - can be heavy
            "/reports/generate/auto": (5, 60),
        }
    
    def _clean_old_requests(self, key: str, window: int):
        """Remove requests older than the window."""
        cutoff = datetime.utcnow() - timedelta(seconds=window)
        self._requests[key] = [
            (ts, count) for ts, count in self._requests[key]
            if ts > cutoff
        ]
    
    def _get_request_count(self, key: str, window: int) -> int:
        """Get total requests in the current window."""
        self._clean_old_requests(key, window)
        return sum(count for _, count in self._requests[key])
    
    def check_rate_limit(
        self, 
        key: str, 
        limit: int = None, 
        window: int = None
    ) -> Tuple[bool, int, int]:
        """Check if request is within rate limit.
        
        Args:
            key: Unique identifier (e.g., IP, user_id, endpoint+IP)
            limit: Max requests allowed in window
            window: Time window in seconds
            
        Returns:
            Tuple of (allowed, remaining, reset_time)
        """
        limit = limit or self.default_limit
        window = window or self.default_window
        
        with self._lock:
            current_count = self._get_request_count(key, window)
            
            if current_count >= limit:
                # Calculate reset time
                oldest = min((ts for ts, _ in self._requests[key]), default=datetime.utcnow())
                reset_time = int((oldest + timedelta(seconds=window) - datetime.utcnow()).total_seconds())
                return False, 0, max(0, reset_time)
            
            # Add current request
            self._requests[key].append((datetime.utcnow(), 1))
            remaining = limit - current_count - 1
            
            return True, remaining, window
    
    def get_limit_for_endpoint(self, path: str) -> Tuple[int, int]:
        """Get rate limit for a specific endpoint."""
        # Check for exact match first
        if path in self.endpoint_limits:
            return self.endpoint_limits[path]
        
        # Check for prefix match
        for endpoint, limits in self.endpoint_limits.items():
            if path.startswith(endpoint):
                return limits
        
        return self.default_limit, self.default_window


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting."""
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        
        # Get user ID from token if authenticated
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.auth.security import decode_token
                token = auth_header.replace("Bearer ", "")
                payload = decode_token(token)
                user_id = payload.get("sub")
            except:
                pass
        
        # Build rate limit key
        path = request.url.path
        key = f"{path}:{user_id or client_ip}"
        
        # Get limits for this endpoint
        limit, window = rate_limiter.get_limit_for_endpoint(path)
        
        # Check rate limit
        allowed, remaining, reset_time = rate_limiter.check_rate_limit(key, limit, window)
        
        if not allowed:
            logger.warning(
                "rate_limit_exceeded",
                path=path,
                client_ip=client_ip,
                user_id=user_id,
                reset_time=reset_time
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": reset_time
                },
                headers={
                    "Retry-After": str(reset_time),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time)
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(window)
        
        return response


def rate_limit(limit: int = 10, window: int = 60):
    """Decorator for custom rate limiting on specific endpoints.
    
    Usage:
        @router.post("/expensive-operation")
        @rate_limit(limit=5, window=60)
        async def expensive_operation():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request from kwargs or args
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request:
                client_ip = request.client.host if request.client else "unknown"
                key = f"{func.__name__}:{client_ip}"
                
                allowed, remaining, reset_time = rate_limiter.check_rate_limit(key, limit, window)
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Retry after {reset_time} seconds.",
                        headers={"Retry-After": str(reset_time)}
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
