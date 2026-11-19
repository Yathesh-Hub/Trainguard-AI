from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.anomaly import AnomalyResponse, AnomalyStatusUpdate
from app.services.anomaly_service import anomaly_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyResponse])
async def list_anomalies(
    centre_id: Optional[str] = None,
    severity: Optional[str] = None,
    review_status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    anomalies = anomaly_service.get_anomalies(
        centre_id=centre_id,
        severity=severity,
        review_status=review_status
    )
    return [AnomalyResponse(**a) for a in anomalies]

@router.put("/{anomaly_id}/status", response_model=Dict[str, Any])
async def update_anomaly_status(
    anomaly_id: str,
    payload: AnomalyStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    res = anomaly_service.update_status(
        anomaly_id=anomaly_id,
        review_status=payload.review_status,
        review_notes=payload.review_notes,
        reviewer_id=current_user.get("id")
    )
    return {"message": "Anomaly status updated successfully.", "anomaly": res}
