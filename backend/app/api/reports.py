import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse
from app.services.report_service import report_service
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Report Generation"])

@router.get("/centre/{centre_id}")
async def get_centre_compliance_report(
    centre_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        pdf_path = report_service.generate_centre_compliance_report(centre_id)
        filename = os.path.basename(pdf_path)
        return {
            "message": "Report generated successfully.",
            "file_name": filename,
            "download_url": f"/api/reports/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate centre report: {str(e)}")

@router.get("/attendance")
async def get_attendance_report(
    centre_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    try:
        pdf_path = report_service.generate_attendance_report(centre_id)
        filename = os.path.basename(pdf_path)
        return {
            "message": "Attendance report generated successfully.",
            "file_name": filename,
            "download_url": f"/api/reports/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate attendance report: {str(e)}")

@router.get("/monthly")
async def get_monthly_report(
    centre_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    # Generates comprehensive monthly audit PDF
    try:
        pdf_path = report_service.generate_attendance_report(centre_id)
        filename = os.path.basename(pdf_path)
        return {
            "message": "Monthly performance report generated successfully.",
            "file_name": filename,
            "download_url": f"/api/reports/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly report: {str(e)}")

@router.get("/download/{file_name}")
async def download_report_file(file_name: str):
    file_path = settings.REPORTS_DIR / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Requested report file not found on server.")
    return FileResponse(path=str(file_path), media_type="application/pdf", filename=file_name)
