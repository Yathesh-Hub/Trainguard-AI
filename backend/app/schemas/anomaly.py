from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AnomalyResponse(BaseModel):
    id: str
    centre_id: str
    centre_name: Optional[str] = None
    category: str
    description: str
    severity: str
    anomaly_date: str
    evidence: Dict[str, Any] = {}
    review_status: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: Optional[str] = None

class AnomalyStatusUpdate(BaseModel):
    review_status: str # open, under_review, resolved, false_positive
    review_notes: Optional[str] = None
