"""Shared API dependencies — auth, database session, etc."""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User

DB = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DB,
    authorization: str = Header(..., description="Bearer <clerk_jwt>"),
) -> User:
    """Extract and validate user from Clerk JWT.

    Dev mode: pass the clerk_id directly as the Bearer token.
    Example: Authorization: Bearer dev_user
    """
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token"
        )

    # Dev mode: treat token as clerk_id
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
    result = await db.execute(select(User).where(User.clerk_id == token))
    return result.scalar_one_or_none()


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
