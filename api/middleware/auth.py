"""JWT validation middleware for FastAPI.

Validates JWTs issued by NextAuth and extracts user information
for use in API endpoints.
"""

import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

# NextAuth JWT secret (same as AUTH_SECRET in Next.js)
AUTH_SECRET = os.getenv("AUTH_SECRET")

if not AUTH_SECRET:
    raise ValueError("Missing AUTH_SECRET environment variable")

# JWT algorithm used by NextAuth
JWT_ALGORITHM = "HS256"

security = HTTPBearer()


class TokenPayload(BaseModel):
    """Decoded JWT payload from NextAuth."""

    sub: str  # User ID
    email: str
    iat: int  # Issued at
    exp: int  # Expiration


class CurrentUser(BaseModel):
    """Authenticated user information."""

    id: str
    email: str


def decode_token(token: str) -> TokenPayload:
    """Decode and validate a JWT token.

    Args:
        token: The JWT string to decode

    Returns:
        TokenPayload with user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            AUTH_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "email", "exp"]},
        )
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> CurrentUser:
    """Dependency to get the current authenticated user.

    Usage:
        @app.get("/protected")
        async def protected_route(user: CurrentUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    token_data = decode_token(credentials.credentials)
    return CurrentUser(id=token_data.sub, email=token_data.email)


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))],
) -> CurrentUser | None:
    """Dependency to get the current user if authenticated, None otherwise.

    Useful for endpoints that work with or without authentication.
    """
    if credentials is None:
        return None

    try:
        token_data = decode_token(credentials.credentials)
        return CurrentUser(id=token_data.sub, email=token_data.email)
    except HTTPException:
        return None


# Type alias for cleaner endpoint signatures
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
OptionalUser = Annotated[CurrentUser | None, Depends(get_optional_user)]
