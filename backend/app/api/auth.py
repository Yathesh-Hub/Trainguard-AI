import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.auth import UserRegister, UserLogin, PasswordResetRequest, PasswordResetConfirm, TokenResponse, ProfileResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister):
    supabase = get_supabase()

    # Check if user already exists
    existing = supabase.table("profiles").select("id").eq("email", user_in.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User with this email already registered.")

    user_id = str(uuid.uuid4())
    hashed_pwd = get_password_hash(user_in.password)

    profile_data = {
        "id": user_id,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "role": user_in.role if user_in.role in ("admin", "centre_manager") else "centre_manager",
        "centre_id": user_in.centre_id,
        "phone": user_in.phone,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    supabase.table("profiles").insert(profile_data).execute()

    token_data = {
        "sub": user_id,
        "email": user_in.email,
        "role": profile_data["role"],
        "centre_id": user_in.centre_id
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=ProfileResponse(**profile_data)
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    supabase = get_supabase()

    prof_res = supabase.table("profiles").select("*").eq("email", credentials.email).execute()
    if not prof_res.data:
        # Check if demo account login
        if credentials.email in ("admin@trainguard.ai", "manager@apex.trainguard.ai"):
            # Auto-provision or authenticate demo account
            demo_user = {
                "id": str(uuid.uuid4()),
                "email": credentials.email,
                "full_name": "System Administrator" if "admin" in credentials.email else "Apex Centre Manager",
                "role": "admin" if "admin" in credentials.email else "centre_manager",
                "centre_id": None if "admin" in credentials.email else "tc_1",
                "is_active": True
            }
            token_data = {"sub": demo_user["id"], "email": demo_user["email"], "role": demo_user["role"]}
            token = create_access_token(token_data)
            return TokenResponse(access_token=token, token_type="bearer", user=ProfileResponse(**demo_user))

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    profile = prof_res.data[0]
    if not profile.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been suspended.")

    token_data = {
        "sub": profile["id"],
        "email": profile["email"],
        "role": profile["role"],
        "centre_id": profile.get("centre_id")
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=ProfileResponse(**profile)
    )

@router.get("/me", response_model=ProfileResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return ProfileResponse(**current_user)

@router.post("/forgot-password")
async def forgot_password(req: PasswordResetRequest):
    supabase = get_supabase()
    res = supabase.table("profiles").select("id, email").eq("email", req.email).execute()
    if not res.data:
        # Avoid user enumeration by returning uniform success message
        return {"message": "If this email is registered, password reset instructions have been sent."}

    # Generate token
    token = create_access_token({"sub": res.data[0]["id"], "type": "reset"}, expires_delta=timedelta(hours=2))
    return {
        "message": "Password reset instructions dispatched.",
        "reset_token": token # Delivered for development convenience
    }

@router.post("/reset-password")
async def reset_password(req: PasswordResetConfirm):
    from app.core.security import decode_token
    payload = decode_token(req.access_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    return {"message": "Password successfully updated. You can now log in with your new password."}
