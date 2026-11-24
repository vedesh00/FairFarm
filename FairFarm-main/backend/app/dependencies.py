"""FastAPI dependency injection utilities for FairFarm.

Provides async Supabase client access, JWT token validation, and role-based guards.

Security notes:
- The user's role is ALWAYS read from the trusted ``public.profiles`` table.
  ``user_metadata`` is editable by the user themselves (``supabase.auth.updateUser``)
  and is therefore never used for authorization.
- Users whose email address has not been verified are rejected, even if a token
  was somehow obtained (defence in depth on top of Supabase "Confirm email").
"""

from typing import Any, Awaitable, Callable, Dict, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from supabase._async.client import AsyncClient

VALID_ROLES = ("farmer", "buyer", "warehouse")


async def get_supabase(request: Request) -> AsyncClient:
    """Return the global async Supabase client initialized in app lifespan."""
    supabase: Optional[AsyncClient] = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client is not initialized in application state.",
        )
    return supabase


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:].strip() if authorization.startswith("Bearer ") else authorization.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token cannot be empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


async def get_current_user(
    authorization: Optional[str] = Header(
        None, description="Bearer token for Supabase Auth"
    ),
    supabase: AsyncClient = Depends(get_supabase),
) -> Dict[str, Any]:
    """Validate Supabase JWT and return the verified user's trusted profile context."""
    token = _extract_bearer_token(authorization)

    try:
        user_response = await supabase.auth.get_user(token)
        user = getattr(user_response, "user", None)
    except Exception as exc:
        # Do not leak provider internals to the client.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(user, "email_confirmed_at", None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address has not been verified.",
        )

    user_id = str(user.id)
    email = getattr(user, "email", "") or ""

    try:
        profile_res = (
            await supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to load user profile. Please try again.",
        ) from exc

    profile_data: Dict[str, Any] = profile_res.data[0] if profile_res.data else {}
    role = profile_data.get("role")
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found or has no valid role.",
        )

    return {
        "id": user_id,
        "email": email,
        "role": role,
        "profile": profile_data,
        "token": token,
    }


def require_role(*roles: str) -> Callable[..., Awaitable[Dict[str, Any]]]:
    """Build a dependency that only admits users whose trusted role is in ``roles``."""

    async def _guard(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in roles:
            pretty = " or ".join(r.capitalize() for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: {pretty} role required for this action.",
            )
        return user

    return _guard


async def require_farmer(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ensure authenticated user has the 'farmer' role."""
    if user.get("role") != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Farmer role required for this action.",
        )
    return user


async def require_buyer(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ensure authenticated user has the 'buyer' role."""
    if user.get("role") != "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Buyer role required for this action.",
        )
    return user


async def require_warehouse(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ensure authenticated user has the 'warehouse' role."""
    if user.get("role") != "warehouse":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Warehouse Holder role required for this action.",
        )
    return user
