from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    course: str
    batch_id: Optional[str] = None
    centre_id: str
    joining_date: Optional[date] = None
    status: str = "active"

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    course: Optional[str] = None
    batch_id: Optional[str] = None
    status: Optional[str] = None

class StudentResponse(StudentBase):
    id: str
    centre_name: Optional[str] = None
    batch_code: Optional[str] = None
    attendance_percentage: Optional[float] = 0.0
    total_present: Optional[int] = 0
    total_absent: Optional[int] = 0
    total_classes: Optional[int] = 0
    created_at: Optional[str] = None

class StudentAttendanceDetail(StudentResponse):
    attendance_history: List[dict] = []
