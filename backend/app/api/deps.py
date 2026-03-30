"""Shared API dependencies — auth, database session, etc."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

DB = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DB,
    authorization: str = Header(..., description="Bearer <token>"),
) -> User:
    """Extract and validate user from JWT or legacy clerk_id token.

    - If token starts with "ey" (JWT), decode it and look up user by ID.
    - Otherwise, treat as clerk_id for backward compatibility (dev mode).
    """
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token"
        )

    # JWT token (starts with "ey")
    if token.startswith("ey"):
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload",
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return user

    # Legacy dev mode: treat token as clerk_id
    result = await db.execute(select(User).where(User.clerk_id == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Create a dev user first: make db-seed",
        )

    return user


async def get_optional_user(
    db: DB,
    authorization: str | None = Header(None),
) -> User | None:
    """Optional auth — returns None if no token provided."""
    if not authorization:
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None

    # JWT token
    if token.startswith("ey"):
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == user_id))
                return result.scalar_one_or_none()
        except JWTError:
            return None
        return None

    # Legacy dev mode
    result = await db.execute(select(User).where(User.clerk_id == token))
    return result.scalar_one_or_none()


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
