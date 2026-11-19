from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date

class AttendanceRecordItem(BaseModel):
    student_id: str
    date: date
    status: str
    remarks: Optional[str] = None

class AttendanceUploadResponse(BaseModel):
    total_records: int
    inserted_records: int
    duplicate_records: int
    unknown_students: List[str]
    anomalies_detected: int
    message: str

class BatchAttendanceTrend(BaseModel):
    batch_id: str
    batch_code: str
    course_name: str
    average_percentage: float
    total_students: int

class AttendanceAnalyticsResponse(BaseModel):
    overall_percentage: float
    total_records: int
    category_breakdown: Dict[str, int]
    threshold_counts: Dict[str, int] # excellent, good, warning, critical
    daily_trends: List[Dict[str, Any]]
    batch_trends: List[BatchAttendanceTrend]
    low_attendance_students: List[Dict[str, Any]]
