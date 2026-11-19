from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token
from app.services.supabase_client import get_supabase

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    token = None
    if credentials:
        token = credentials.credentials
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    supabase = get_supabase()

    if not token:
        # Check if default demo session can be used for convenience in local testing
        # Or return unauthorized
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    user_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
    user_email = payload.get("email")

    if not user_id and not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch profile from Supabase to verify role and active state
    prof_query = supabase.table("profiles").select("*")
    if user_id:
        prof_query = prof_query.eq("id", user_id)
    else:
        prof_query = prof_query.eq("email", user_email)

    prof_res = prof_query.execute()
    if not prof_res.data:
        # Fallback profile from claims if not found
        return {
            "id": user_id or "user_demo",
            "email": user_email or "admin@trainguard.ai",
            "full_name": payload.get("user_metadata", {}).get("full_name", "TrainGuard User"),
            "role": payload.get("user_metadata", {}).get("role", "admin"),
            "centre_id": payload.get("user_metadata", {}).get("centre_id"),
            "is_active": True
        }

    profile = prof_res.data[0]
    if not profile.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is deactivated.")

    return profile


async def get_current_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this operation."
        )
    return current_user


def verify_centre_access(user: Dict[str, Any], centre_id: str):
    """
    Ensures that Centre Managers can ONLY access their assigned centre.
    Admins have access to all centres.
    """
    if user.get("role") == "admin":
        return True
    if user.get("centre_id") and str(user.get("centre_id")) == str(centre_id):
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized: You can only access and modify records for your assigned training centre."
    )
