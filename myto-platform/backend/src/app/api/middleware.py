"""
Rate limit and API key validation middleware scaffold.
Enforcement can be enabled later via config.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import get_settings

# Placeholder: no rate limit or API key enforced by default
RATE_LIMIT_ENABLED = False
API_KEY_ENABLED = False


async def rate_limit_hook(request: Request) -> None:
    """Hook: check rate limit for request. Can raise 429."""
    if not RATE_LIMIT_ENABLED:
        return
    # TODO: check X-Forwarded-For or request.client, increment counter, compare to limit
    pass


async def api_key_validation_hook(request: Request) -> None:
    """Hook: validate X-API-Key header if required. Can raise 401."""
    if not API_KEY_ENABLED:
        return
    # Skip for public routes (e.g. health)
    if request.url.path.rstrip("/").endswith("/v1/health"):
        return
    # TODO: validate key against tenants table, attach tenant_id to request.state
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        pass  # Allow unauthenticated when not enforced
    pass


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        await rate_limit_hook(request)
        return await call_next(request)


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        await api_key_validation_hook(request)
        return await call_next(request)
