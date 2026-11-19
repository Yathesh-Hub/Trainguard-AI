from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from app.schemas.infrastructure import InfrastructureInspectionResponse, FindingVerifyRequest
from app.services.infrastructure_service import infrastructure_service
from app.services.supabase_client import get_supabase
from app.api.deps import get_current_user, verify_centre_access

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure Compliance"])

@router.post("/upload", response_model=InfrastructureInspectionResponse, status_code=status.HTTP_201_CREATED)
async def upload_infrastructure_image(
    file: UploadFile = File(...),
    centre_id: str = Form(...),
    room_name: str = Form(...),
    remarks: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    verify_centre_access(current_user, centre_id)

    res = await infrastructure_service.process_inspection_upload(
        file=file,
        centre_id=centre_id,
        room_name=room_name,
        inspector_id=current_user.get("id"),
        remarks=remarks
    )
    return InfrastructureInspectionResponse(**res)

@router.get("/inspections", response_model=List[InfrastructureInspectionResponse])
async def list_inspections(
    centre_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    supabase = get_supabase()
    if current_user.get("role") != "admin" and current_user.get("centre_id"):
        centre_id = current_user["centre_id"]

    query = supabase.table("infrastructure_inspections").select("*")
    if centre_id:
        query = query.eq("centre_id", centre_id)

    inspections = query.order("created_at", desc=True).execute().data

    centres = {c["id"]: c["name"] for c in supabase.table("training_centres").select("id, name").execute().data}
    all_findings = supabase.table("infrastructure_findings").select("*").execute().data

    findings_by_insp = {}
    for f in all_findings:
        iid = f.get("inspection_id")
        findings_by_insp.setdefault(iid, []).append(f)

    result = []
    for ins in inspections:
        ins_copy = dict(ins)
        ins_copy["centre_name"] = centres.get(ins.get("centre_id"), "Unknown Centre")
        ins_copy["findings"] = findings_by_insp.get(ins["id"], [])
        result.append(InfrastructureInspectionResponse(**ins_copy))

    return result

@router.get("/requirements")
async def get_requirements():
    supabase = get_supabase()
    reqs = supabase.table("infrastructure_requirements").select("*").execute().data
    return reqs

@router.post("/verify/{finding_id}")
async def verify_finding(
    finding_id: str,
    payload: FindingVerifyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    updated = infrastructure_service.verify_finding(
        finding_id=finding_id,
        verification_status=payload.verification_status,
        notes=payload.inspector_notes
    )
    return {"message": "Finding verification status updated successfully.", "finding": updated}
