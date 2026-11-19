from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date

class InfrastructureFindingResponse(BaseModel):
    id: str
    inspection_id: str
    requirement_id: Optional[str] = None
    detected_label: str
    confidence_score: Optional[float] = None
    bounding_box: Optional[Dict[str, Any]] = None
    ai_detected: bool = True
    human_verified: bool = False
    verification_status: str
    inspector_notes: Optional[str] = None

class InfrastructureInspectionResponse(BaseModel):
    id: str
    centre_id: str
    centre_name: Optional[str] = None
    inspection_date: str
    room_name: str
    image_path: str
    image_signed_url: Optional[str] = None
    overall_compliance_status: str
    remarks: Optional[str] = None
    findings: List[InfrastructureFindingResponse] = []
    missing_requirements: List[str] = []
    created_at: Optional[str] = None

class FindingVerifyRequest(BaseModel):
    verification_status: str # 'verified', 'rejected', 'manual_added'
    inspector_notes: Optional[str] = None
