from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "centre_manager"  # admin or centre_manager
    centre_id: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    access_token: str
    new_password: str

class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    centre_id: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ProfileResponse
