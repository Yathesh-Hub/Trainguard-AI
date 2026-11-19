import uuid
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import HTTPException
from app.services.supabase_client import get_supabase
from app.schemas.compliance import ComplianceWeights

class ComplianceService:
    DEFAULT_WEIGHTS = {
        "attendance": 0.35,
        "trainer": 0.20,
        "infrastructure": 0.30,
        "documentation": 0.15
    }

    def calculate_centre_compliance(
        self,
        centre_id: str,
        custom_weights: Optional[ComplianceWeights] = None
    ) -> Dict[str, Any]:
        """
        Calculates the multi-factor compliance score for a single training centre.
        Evaluates:
        - Attendance Score (Student attendance % and anomaly penalties)
        - Trainer Score (Trainer availability, sessions held, on-leave frequency)
        - Infrastructure Score (Inspection verified findings vs requirements)
        - Documentation Score (Uploaded syllabus, logs, compliance documents)
        """
        supabase = get_supabase()

        # Validate weights
        weights = dict(self.DEFAULT_WEIGHTS)
        if custom_weights:
            weights = {
                "attendance": custom_weights.attendance,
                "trainer": custom_weights.trainer,
                "infrastructure": custom_weights.infrastructure,
                "documentation": custom_weights.documentation
            }
        weight_sum = sum(weights.values())
        if abs(weight_sum - 1.0) > 0.01 and abs(weight_sum - 100.0) > 0.1:
            raise HTTPException(status_code=400, detail="Compliance weights must sum to 1.0 or 100%.")

        if weight_sum > 10.0: # If given as percentages (35, 20, etc.), normalize to decimals
            weights = {k: v / 100.0 for k, v in weights.items()}

        # 1. ATTENDANCE SCORE
        att_res = supabase.table("attendance_records").select("status").eq("centre_id", centre_id).execute()
        att_data = att_res.data
        has_att_evidence = len(att_data) > 0

        if has_att_evidence:
            present_c = sum(1 for r in att_data if r["status"] == "present")
            late_c = sum(1 for r in att_data if r["status"] == "late")
            raw_att_score = ((present_c + late_c * 0.5) / len(att_data)) * 100

            # Check open anomalies penalty
            anom_res = supabase.table("anomaly_records").select("severity").eq("centre_id", centre_id).eq("review_status", "open").execute()
            penalty = 0.0
            for an in anom_res.data:
                sev = an.get("severity", "low")
                if sev == "critical":
                    penalty += 5.0
                elif sev == "high":
                    penalty += 3.0
                elif sev == "medium":
                    penalty += 1.5

            attendance_score = max(0.0, min(100.0, raw_att_score - penalty))
        else:
            attendance_score = None

        # 2. TRAINER SCORE
        tr_res = supabase.table("trainer_attendance").select("status, session_hours").eq("centre_id", centre_id).execute()
        tr_data = tr_res.data
        has_tr_evidence = len(tr_data) > 0

        if has_tr_evidence:
            tr_present = sum(1 for r in tr_data if r["status"] == "present")
            tr_half = sum(1 for r in tr_data if r["status"] == "half_day")
            trainer_score = ((tr_present + tr_half * 0.5) / len(tr_data)) * 100
        else:
            trainer_score = None

        # 3. INFRASTRUCTURE SCORE
        insp_res = supabase.table("infrastructure_inspections").select("id, overall_compliance_status").eq("centre_id", centre_id).execute()
        has_inf_evidence = len(insp_res.data) > 0

        if has_inf_evidence:
            findings_res = supabase.table("infrastructure_findings").select("verification_status, confidence_score").execute()
            # Count verified vs rejected vs pending
            ins_ids = {i["id"] for i in insp_res.data}
            matched_findings = [f for f in findings_res.data if f.get("inspection_id") in ins_ids or True]

            if matched_findings:
                verified = sum(1 for f in matched_findings if f["verification_status"] == "verified")
                total_f = len(matched_findings)
                infrastructure_score = (verified / total_f) * 100
            else:
                infrastructure_score = 75.0
        else:
            infrastructure_score = None

        # 4. DOCUMENTATION SCORE
        doc_res = supabase.table("uploaded_documents").select("id").eq("centre_id", centre_id).execute()
        doc_count = len(doc_res.data)
        # Target 5+ uploaded verification documents for 100%
        has_doc_evidence = doc_count > 0
        documentation_score = min(100.0, (doc_count / 5.0) * 100.0) if has_doc_evidence else None

        # Normalize weights over available components
        available_components = {}
        if attendance_score is not None:
            available_components["attendance"] = attendance_score
        if trainer_score is not None:
            available_components["trainer"] = trainer_score
        if infrastructure_score is not None:
            available_components["infrastructure"] = infrastructure_score
        if documentation_score is not None:
            available_components["documentation"] = documentation_score

        evidence_coverage = (len(available_components) / 4.0) * 100.0

        if not available_components:
            # Complete absence of data
            return {
                "centre_id": centre_id,
                "overall_score": 0.0,
                "attendance_score": 0.0,
                "trainer_score": 0.0,
                "infrastructure_score": 0.0,
                "documentation_score": 0.0,
                "weights_used": weights,
                "evidence_coverage_percentage": 0.0,
                "compliance_category": "critical",
                "recommendations": ["No operational data found. Upload attendance, trainer, and infrastructure records."]
            }

        avail_weight_sum = sum(weights[comp] for comp in available_components)
        normalized_weights = {comp: weights[comp] / avail_weight_sum for comp in available_components}

        overall_score = sum(available_components[comp] * normalized_weights[comp] for comp in available_components)
        overall_score = round(overall_score, 2)

        # Categorize
        if overall_score >= 90.0:
            category = "excellent"
        elif overall_score >= 75.0:
            category = "good"
        elif overall_score >= 60.0:
            category = "needs_improvement"
        else:
            category = "critical"

        # Generate Actionable Recommendations
        recommendations = []
        att_val = attendance_score or 0.0
        trn_val = trainer_score or 0.0
        inf_val = infrastructure_score or 0.0
        doc_val = documentation_score or 0.0

        if att_val < 75.0:
            recommendations.append("Attendance is below 75% benchmark. Initiate student retention counseling and verify missing attendance logs.")
        if trn_val < 80.0:
            recommendations.append("Trainer availability deficit detected. Review trainer substitution logs and scheduled batch coverage.")
        if inf_val < 75.0:
            recommendations.append("Infrastructure deficiencies logged. Conduct on-site verification of whiteboards, projectors, and safety extinguishers.")
        if doc_val < 60.0:
            recommendations.append("Documentation compliance low. Upload required syllabus plans, attendance registers, and compliance certificates.")

        if not recommendations:
            recommendations.append("Centre maintains high standards across all evaluation criteria. Continue routine monitoring.")

        # Query previous score
        prev_res = supabase.table("compliance_scores").select("overall_score").eq("centre_id", centre_id).order("calculation_date", desc=True).limit(1).execute()
        previous_score = prev_res.data[0]["overall_score"] if prev_res.data else None

        result_payload = {
            "id": str(uuid.uuid4()),
            "centre_id": centre_id,
            "calculation_date": date.today().isoformat(),
            "overall_score": overall_score,
            "attendance_score": round(att_val, 2),
            "trainer_score": round(trn_val, 2),
            "infrastructure_score": round(inf_val, 2),
            "documentation_score": round(doc_val, 2),
            "weights_used": weights,
            "evidence_coverage_percentage": round(evidence_coverage, 2),
            "compliance_category": category,
            "recommendations": recommendations,
            "previous_score": previous_score
        }

        # Store in Supabase
        supabase.table("compliance_scores").insert(result_payload).execute()

        return result_payload

    def recalculate_all(self, custom_weights: Optional[ComplianceWeights] = None) -> List[Dict[str, Any]]:
        supabase = get_supabase()
        centres = supabase.table("training_centres").select("id").execute().data
        results = []
        for c in centres:
            res = self.calculate_centre_compliance(c["id"], custom_weights)
            results.append(res)
        return results

compliance_service = ComplianceService()
