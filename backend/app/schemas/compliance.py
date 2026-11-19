from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ComplianceWeights(BaseModel):
    attendance: float = 0.35
    trainer: float = 0.20
    infrastructure: float = 0.30
    documentation: float = 0.15

class ComplianceRecalculateRequest(BaseModel):
    centre_id: Optional[str] = None # None means all centres
    weights: Optional[ComplianceWeights] = None

class ComplianceScoreResponse(BaseModel):
    id: str
    centre_id: str
    centre_name: Optional[str] = None
    calculation_date: str
    overall_score: float
    attendance_score: float
    trainer_score: float
    infrastructure_score: float
    documentation_score: float
    weights_used: Dict[str, float]
    evidence_coverage_percentage: float
    compliance_category: str
    recommendations: List[str] = []
    previous_score: Optional[float] = None
    created_at: Optional[str] = None

class ComplianceOverviewResponse(BaseModel):
    average_score: float
    category_counts: Dict[str, int]
    top_performing_centres: List[ComplianceScoreResponse]
    critical_centres: List[ComplianceScoreResponse]
    all_scores: List[ComplianceScoreResponse]
