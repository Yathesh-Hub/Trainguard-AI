from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

class CentreBase(BaseModel):
    centre_code: str
    name: str
    address: str
    district: str
    state: str
    contact_person: str
    phone: str
    email: EmailStr
    total_capacity: int = 100
    establishment_date: Optional[date] = None
    status: str = "active"

class CentreCreate(CentreBase):
    pass

class CentreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    total_capacity: Optional[int] = None
    status: Optional[str] = None

class CentreResponse(CentreBase):
    id: str
    total_students: Optional[int] = 0
    total_trainers: Optional[int] = 0
    average_attendance: Optional[float] = 0.0
    latest_compliance_score: Optional[float] = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CentreDetailResponse(CentreResponse):
    batches: Optional[List[dict]] = []
    trainers: Optional[List[dict]] = []
    active_anomalies_count: Optional[int] = 0
