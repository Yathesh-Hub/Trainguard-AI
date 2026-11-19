import uuid
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
from app.services.supabase_client import get_supabase
from app.services.storage_service import StorageService
from app.ai.cv_detector import cv_detector

class InfrastructureService:
    async def process_inspection_upload(
        self,
        file: UploadFile,
        centre_id: str,
        room_name: str,
        inspector_id: Optional[str] = None,
        remarks: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uploads infrastructure image to Supabase Storage, runs OpenCV CV detection,
        maps findings to requirements, and stores inspection & finding records.
        """
        # Upload file via StorageService
        upload_res = await StorageService.upload_file(
            file=file,
            centre_id=centre_id,
            category="infrastructure",
            uploaded_by_id=inspector_id
        )

        # Run CV Detection
        cv_result = cv_detector.analyze_image(upload_res["raw_content"])

        supabase = get_supabase()

        # Query existing requirements
        reqs_res = supabase.table("infrastructure_requirements").select("*").execute()
        req_map = {r["item_name"].lower(): r["id"] for r in reqs_res.data}

        # Create Inspection Record
        inspection_id = str(uuid.uuid4())
        inspection_record = {
            "id": inspection_id,
            "centre_id": centre_id,
            "inspector_id": inspector_id,
            "inspection_date": upload_res.get("created_at", "2024-02-18"),
            "room_name": room_name,
            "image_path": upload_res["storage_path"],
            "image_signed_url": upload_res["signed_url"],
            "overall_compliance_status": cv_result["overall_status"],
            "remarks": remarks or f"Automated inspection: {cv_result['verified_count']}/{cv_result['total_items']} items detected above threshold."
        }
        supabase.table("infrastructure_inspections").insert(inspection_record).execute()

        # Create Finding Records
        finding_records = []
        for finding in cv_result["findings"]:
            req_id = req_map.get(finding["detected_label"].lower())
            finding_id = str(uuid.uuid4())
            f_record = {
                "id": finding_id,
                "inspection_id": inspection_id,
                "requirement_id": req_id,
                "detected_label": finding["detected_label"],
                "confidence_score": finding["confidence_score"],
                "bounding_box": finding["bounding_box"],
                "ai_detected": finding["ai_detected"],
                "human_verified": finding["human_verified"],
                "verification_status": finding["verification_status"],
                "inspector_notes": finding["inspector_notes"]
            }
            finding_records.append(f_record)

        if finding_records:
            supabase.table("infrastructure_findings").insert(finding_records).execute()

        inspection_record["findings"] = finding_records
        return inspection_record

    def verify_finding(self, finding_id: str, verification_status: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Allows human auditor/admin to verify, reject, or manually override an AI finding.
        """
        if verification_status not in ("verified", "rejected", "manual_added"):
            raise HTTPException(status_code=400, detail="Invalid verification status. Must be verified, rejected, or manual_added.")

        supabase = get_supabase()
        update_data = {
            "verification_status": verification_status,
            "human_verified": True,
            "inspector_notes": notes
        }
        res = supabase.table("infrastructure_findings").update(update_data).eq("id", finding_id).execute()
        return res.data[0] if res.data else update_data

infrastructure_service = InfrastructureService()
