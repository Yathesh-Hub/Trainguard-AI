import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.core.config import settings
from app.services.supabase_client import get_supabase

class ReportService:
    def __init__(self):
        self.reports_dir = settings.REPORTS_DIR
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def _get_base_styles(self):
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=15
        )
        section_style = ParagraphStyle(
            'ReportSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#2563EB'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1E293B')
        )
        return title_style, subtitle_style, section_style, body_style

    def generate_centre_compliance_report(self, centre_id: str) -> str:
        """
        Generates a comprehensive PDF compliance report for a specific training centre.
        """
        supabase = get_supabase()
        centre_res = supabase.table("training_centres").select("*").eq("id", centre_id).execute()
        if not centre_res.data:
            raise ValueError(f"Training centre with ID {centre_id} not found.")
        centre = centre_res.data[0]

        # Fetch latest compliance score
        score_res = supabase.table("compliance_scores").select("*").eq("centre_id", centre_id).order("calculation_date", desc=True).limit(1).execute()
        score = score_res.data[0] if score_res.data else {
            "overall_score": 0.0,
            "attendance_score": 0.0,
            "trainer_score": 0.0,
            "infrastructure_score": 0.0,
            "documentation_score": 0.0,
            "compliance_category": "pending",
            "evidence_coverage_percentage": 100.0,
            "recommendations": []
        }

        # Anomalies
        anom_res = supabase.table("anomaly_records").select("*").eq("centre_id", centre_id).execute()
        anomalies = anom_res.data

        file_name = f"Compliance_Report_{centre['centre_code']}_{date.today().isoformat()}.pdf"
        file_path = str(self.reports_dir / file_name)

        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        title_style, subtitle_style, section_style, body_style = self._get_base_styles()
        elements = []

        # Header
        elements.append(Paragraph("TRAINGUARD AI • COMPLIANCE AUDIT REPORT", ParagraphStyle('SuperTitle', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#2563EB'), spaceAfter=4)))
        elements.append(Paragraph(f"Centre Compliance Evaluation: {centre['name']}", title_style))
        elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M UTC')} | Centre Code: {centre['centre_code']}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=15))

        # Centre Details Grid
        details_data = [
            [Paragraph("<b>Location:</b>", body_style), Paragraph(f"{centre['address']}, {centre['district']}, {centre['state']}", body_style),
             Paragraph("<b>Status:</b>", body_style), Paragraph(centre['status'].upper(), body_style)],
            [Paragraph("<b>Contact Person:</b>", body_style), Paragraph(centre['contact_person'], body_style),
             Paragraph("<b>Phone / Email:</b>", body_style), Paragraph(f"{centre['phone']} | {centre['email']}", body_style)],
            [Paragraph("<b>Capacity:</b>", body_style), Paragraph(str(centre.get('total_capacity', 100)), body_style),
             Paragraph("<b>Audit Category:</b>", body_style), Paragraph(str(score.get('compliance_category', 'N/A')).upper(), body_style)]
        ]
        t_details = Table(details_data, colWidths=[100, 200, 100, 140])
        t_details.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_details)
        elements.append(Spacer(1, 15))

        # Executive Summary Score Card
        elements.append(Paragraph("1. Executive Compliance Scorecard", section_style))
        score_table_data = [
            ["Evaluation Metric", "Weight", "Score Achieved", "Status"],
            ["Overall Compliance Index", "100%", f"{score.get('overall_score', 0):.2f} / 100", str(score.get('compliance_category', '')).upper()],
            ["Student Attendance Factor", "35%", f"{score.get('attendance_score', 0):.2f} / 100", "Evaluated"],
            ["Trainer Availability & Delivery", "20%", f"{score.get('trainer_score', 0):.2f} / 100", "Evaluated"],
            ["Classroom Infrastructure Compliance", "30%", f"{score.get('infrastructure_score', 0):.2f} / 100", "Evaluated"],
            ["Documentation & Verification", "15%", f"{score.get('documentation_score', 0):.2f} / 100", "Evaluated"]
        ]
        t_score = Table(score_table_data, colWidths=[200, 80, 120, 140])
        t_score.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2563EB')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t_score)
        elements.append(Spacer(1, 15))

        # Identified Anomalies Section
        elements.append(Paragraph("2. AI-Detected Irregularities & Anomalies", section_style))
        if anomalies:
            anom_data = [["Severity", "Category", "Date", "Description", "Status"]]
            for an in anomalies[:8]:
                anom_data.append([
                    an.get("severity", "").upper(),
                    an.get("category", "").replace("_", " ").title(),
                    str(an.get("anomaly_date", "")),
                    Paragraph(an.get("description", ""), body_style),
                    an.get("review_status", "").upper()
                ])
            t_anom = Table(anom_data, colWidths=[70, 100, 75, 215, 80])
            t_anom.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            elements.append(t_anom)
        else:
            elements.append(Paragraph("No open anomalies or attendance discrepancies detected for this centre.", body_style))

        elements.append(Spacer(1, 15))

        # Recommendations Section
        elements.append(Paragraph("3. Recommendations & Corrective Actions", section_style))
        recs = score.get("recommendations", [])
        if recs:
            for idx, rec in enumerate(recs, start=1):
                elements.append(Paragraph(f"• <b>Action {idx}:</b> {rec}", body_style))
                elements.append(Spacer(1, 3))
        else:
            elements.append(Paragraph("No critical corrective actions required. Maintain existing standard operating procedures.", body_style))

        # Footer
        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
        elements.append(Paragraph("TrainGuard AI Audit Engine • Confidential • Validated with Supabase Managed Backend", ParagraphStyle('Foot', fontName='Helvetica', fontSize=8, textColor=colors.HexColor('#94A3B8'))))

        doc.build(elements)
        return file_path

    def generate_attendance_report(self, centre_id: Optional[str] = None) -> str:
        """
        Generates student attendance analytical PDF report.
        """
        from app.services.attendance_service import attendance_service
        analytics = attendance_service.get_attendance_analytics(centre_id)

        file_name = f"Attendance_Summary_Report_{date.today().isoformat()}.pdf"
        file_path = str(self.reports_dir / file_name)

        doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        title_style, subtitle_style, section_style, body_style = self._get_base_styles()
        elements = []

        elements.append(Paragraph("TRAINGUARD AI • ATTENDANCE ANALYTICS REPORT", ParagraphStyle('SuperTitle', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#2563EB'), spaceAfter=4)))
        elements.append(Paragraph("Student Attendance & Cohort Performance Audit", title_style))
        elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M UTC')}", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=15))

        # KPI Metrics
        kpi_data = [
            ["Overall Attendance", "Total Logs Evaluated", "Critical (<60%)", "Excellent (>=90%)"],
            [f"{analytics['overall_percentage']:.1f}%", str(analytics['total_records']), str(analytics['threshold_counts']['critical']), str(analytics['threshold_counts']['excellent'])]
        ]
        t_kpi = Table(kpi_data, colWidths=[135, 135, 135, 135])
        t_kpi.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,1), (-1,1), 14),
            ('TEXTCOLOR', (0,1), (-1,1), colors.HexColor('#2563EB')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(t_kpi)
        elements.append(Spacer(1, 15))

        # Batch Performance Table
        elements.append(Paragraph("Batch-Level Performance Breakdown", section_style))
        batch_table_data = [["Batch Code", "Course Name", "Students", "Attendance Rate"]]
        for b in analytics.get("batch_trends", []):
            batch_table_data.append([
                b.get("batch_code", "N/A"),
                b.get("course_name", "N/A"),
                str(b.get("total_students", 0)),
                f"{b.get('average_percentage', 0):.1f}%"
            ])
        t_batch = Table(batch_table_data, colWidths=[100, 240, 80, 120])
        t_batch.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_batch)
        elements.append(Spacer(1, 15))

        # Low attendance watchlist
        elements.append(Paragraph("Critical Students Watchlist (<75% Attendance)", section_style))
        low_data = [["Student ID", "Full Name", "Batch", "Attended", "Total", "Rate", "Status"]]
        for s in analytics.get("low_attendance_students", []):
            low_data.append([
                s.get("student_id", ""),
                s.get("name", ""),
                s.get("batch", ""),
                str(s.get("classes_attended", 0)),
                str(s.get("total_classes", 0)),
                f"{s.get('attendance_rate', 0):.1f}%",
                s.get("status_badge", "")
            ])
        t_low = Table(low_data, colWidths=[90, 130, 80, 60, 60, 60, 60])
        t_low.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#DC2626')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_low)

        doc.build(elements)
        return file_path

report_service = ReportService()
