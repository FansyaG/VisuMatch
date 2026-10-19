import secrets
from typing import Optional
from fastapi import Header
from app.core.config import settings
from app.core.errors import UnauthorizedException


async def verify_internal_token(x_internal_token: Optional[str] = Header(default=None, alias="X-Internal-Token")) -> str:
    if not x_internal_token:
        raise UnauthorizedException("Missing X-Internal-Token header")
    if not secrets.compare_digest(x_internal_token, settings.INTERNAL_SERVICE_TOKEN):
        raise UnauthorizedException("Invalid X-Internal-Token")
    return x_internal_token
