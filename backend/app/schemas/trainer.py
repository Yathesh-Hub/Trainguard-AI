from pydantic import BaseModel, EmailStr
from typing import Optional, List

class TrainerBase(BaseModel):
    trainer_id: str
    name: str
    email: EmailStr
    phone: str
    subject: str
    assigned_centre_id: str
    assigned_batch_id: Optional[str] = None
    employment_status: str = "active"

class TrainerCreate(TrainerBase):
    pass

class TrainerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    assigned_centre_id: Optional[str] = None
    assigned_batch_id: Optional[str] = None
    employment_status: Optional[str] = None

class TrainerResponse(TrainerBase):
    id: str
    centre_name: Optional[str] = None
    batch_code: Optional[str] = None
    attendance_percentage: Optional[float] = 0.0
    total_sessions_conducted: Optional[int] = 0
    total_hours_taught: Optional[float] = 0.0
    created_at: Optional[str] = None
