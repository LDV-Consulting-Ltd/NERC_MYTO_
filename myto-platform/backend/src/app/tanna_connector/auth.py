"""Bearer token authentication for Tanna connector routes."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)


async def require_tanna_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    settings = get_settings()
    if not settings.tanna_connector_token:
        raise HTTPException(status_code=401, detail="Tanna connector token not configured")
    if credentials.credentials != settings.tanna_connector_token:
        raise HTTPException(status_code=401, detail="Invalid token")
