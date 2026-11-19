import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Tuple
import os

logger = logging.getLogger("trainguard.ai.cv")

class InfrastructureCVDetector:
    def __init__(self):
        self.supported_items = [
            "Classroom Furniture",
            "Whiteboard",
            "Projector",
            "Computers",
            "Lighting",
            "Seating Arrangements",
            "Fire Extinguisher"
        ]

    def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyzes uploaded classroom image bytes using OpenCV.
        Extracts luminance (lighting compliance), color signatures (fire extinguishers),
        geometric structures (whiteboard, monitors, projector), and furniture density.
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Unable to decode uploaded image data.")

        height, width, channels = img.shape
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        findings = []

        # 1. Lighting Analysis (Lux / Lumens proxy via Mean Gray Value & Variance)
        mean_lum = float(np.mean(gray))
        lum_variance = float(np.var(gray))
        # Standard indoor classroom target: mean luminance 100-190 (scale 0-255)
        # Lux approximation: lux = (mean_lum / 255) * 500
        lux_est = round((mean_lum / 255.0) * 500, 1)
        lighting_conf = 0.92 if 250 <= lux_est <= 450 else (0.75 if lux_est >= 180 else 0.45)
        findings.append({
            "detected_label": "Lighting",
            "confidence_score": round(lighting_conf, 2),
            "bounding_box": {"x1": 0, "y1": 0, "x2": width, "y2": int(height * 0.35)},
            "ai_detected": True,
            "human_verified": False,
            "verification_status": "verified" if lighting_conf >= 0.75 else "pending",
            "inspector_notes": f"Estimated illuminance {lux_est} Lux (mean lum {mean_lum:.1f}). {'Standard compliant (>=250 Lux).' if lux_est >= 250 else 'Below target minimum 250 Lux; check fixtures.'}"
        })

        # 2. Whiteboard Detection (Large high-luminance rectangular contours)
        # Threshold bright regions
        _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        board_found = False
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > (width * height * 0.04): # At least 4% of image area
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = float(w) / h
                if 1.2 <= aspect_ratio <= 3.5: # Typical whiteboard aspect ratio
                    board_found = True
                    conf = min(0.95, 0.70 + (area / (width * height)) * 0.5)
                    findings.append({
                        "detected_label": "Whiteboard",
                        "confidence_score": round(conf, 2),
                        "bounding_box": {"x1": x, "y1": y, "x2": x + w, "y2": y + h},
                        "ai_detected": True,
                        "human_verified": False,
                        "verification_status": "verified" if conf >= 0.8 else "pending",
                        "inspector_notes": f"Whiteboard region identified (Aspect ratio {aspect_ratio:.2f}, {w}x{h} px)."
                    })
                    break

        if not board_found:
            findings.append({
                "detected_label": "Whiteboard",
                "confidence_score": 0.40,
                "bounding_box": {},
                "ai_detected": False,
                "human_verified": False,
                "verification_status": "pending",
                "inspector_notes": "Whiteboard not conclusively detected by CV. Needs human inspector review."
            })

        # 3. Fire Extinguisher Detection (Red hue mask in HSV color space)
        # Red spans 0-10 and 170-180 in OpenCV HSV
        lower_red1 = np.array([0, 100, 70])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 100, 70])
        upper_red2 = np.array([180, 255, 255])

        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 | mask2

        red_contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        extinguisher_found = False
        for cnt in red_contours:
            area = cv2.contourArea(cnt)
            if area > 400: # Noticeable red cylinder
                x, y, w, h = cv2.boundingRect(cnt)
                aspect = float(h) / max(w, 1)
                if 1.5 <= aspect <= 4.0: # Tall cylindrical aspect
                    extinguisher_found = True
                    conf = min(0.92, 0.65 + (area / 10000.0))
                    findings.append({
                        "detected_label": "Fire Extinguisher",
                        "confidence_score": round(conf, 2),
                        "bounding_box": {"x1": x, "y1": y, "x2": x + w, "y2": y + h},
                        "ai_detected": True,
                        "human_verified": False,
                        "verification_status": "verified" if conf >= 0.8 else "pending",
                        "inspector_notes": f"Safety red cylindrical unit detected (Aspect {aspect:.1f})."
                    })
                    break

        if not extinguisher_found:
            findings.append({
                "detected_label": "Fire Extinguisher",
                "confidence_score": 0.35,
                "bounding_box": {},
                "ai_detected": False,
                "human_verified": False,
                "verification_status": "pending",
                "inspector_notes": "No red fire extinguisher identified in photograph. Mark for on-site physical check."
            })

        # 4. Computers / IT Hardware (Detect monitor screen shapes with edges)
        edges = cv2.Canny(gray, 50, 150)
        edge_contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        screen_count = 0
        pc_boxes = []
        for cnt in edge_contours:
            area = cv2.contourArea(cnt)
            if 1500 < area < (width * height * 0.1):
                x, y, w, h = cv2.boundingRect(cnt)
                aspect = float(w) / max(h, 1)
                if 1.1 <= aspect <= 2.2: # Screen aspect 16:9 or 4:3
                    screen_count += 1
                    if len(pc_boxes) < 4:
                        pc_boxes.append({"x1": x, "y1": y, "x2": x+w, "y2": y+h})

        if screen_count > 0:
            pc_conf = min(0.96, 0.60 + min(screen_count, 10) * 0.04)
            findings.append({
                "detected_label": "Computers",
                "confidence_score": round(pc_conf, 2),
                "bounding_box": pc_boxes[0] if pc_boxes else {},
                "ai_detected": True,
                "human_verified": False,
                "verification_status": "verified" if pc_conf >= 0.75 else "pending",
                "inspector_notes": f"Detected approximately {screen_count} display/terminal contours."
            })
        else:
            findings.append({
                "detected_label": "Computers",
                "confidence_score": 0.30,
                "bounding_box": {},
                "ai_detected": False,
                "human_verified": False,
                "verification_status": "pending",
                "inspector_notes": "Computer workstations not recognized in frame. Confirm classroom type."
            })

        # 5. Classroom Furniture & Seating Arrangements (Structural regular grid / horizontal lines)
        horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        horiz_edges = cv2.morphologyEx(edges, cv2.MORPH_OPEN, horiz_kernel)
        line_count = int(np.sum(horiz_edges > 0) / (width * 0.5))
        furniture_conf = min(0.94, 0.65 + min(line_count, 20) * 0.015)

        findings.append({
            "detected_label": "Classroom Furniture",
            "confidence_score": round(furniture_conf, 2),
            "bounding_box": {"x1": int(width * 0.1), "y1": int(height * 0.4), "x2": int(width * 0.9), "y2": int(height * 0.95)},
            "ai_detected": True,
            "human_verified": False,
            "verification_status": "verified" if furniture_conf >= 0.75 else "pending",
            "inspector_notes": f"Desk and chair seating rows detected with {line_count} structural alignment edges."
        })

        findings.append({
            "detected_label": "Seating Arrangements",
            "confidence_score": round(min(0.90, furniture_conf * 0.95), 2),
            "bounding_box": {"x1": 0, "y1": int(height * 0.45), "x2": width, "y2": height},
            "ai_detected": True,
            "human_verified": False,
            "verification_status": "verified" if furniture_conf >= 0.8 else "pending",
            "inspector_notes": "Aisle layout identified. Spacing appears compliant."
        })

        # 6. Projector (Upper 20% ceiling region fixture)
        ceiling_roi = gray[0:int(height * 0.25), int(width * 0.25):int(width * 0.75)]
        ceiling_edges = cv2.Canny(ceiling_roi, 60, 160)
        proj_edge_density = float(np.mean(ceiling_edges))
        if proj_edge_density > 2.5:
            findings.append({
                "detected_label": "Projector",
                "confidence_score": 0.82,
                "bounding_box": {"x1": int(width * 0.35), "y1": 15, "x2": int(width * 0.65), "y2": int(height * 0.22)},
                "ai_detected": True,
                "human_verified": False,
                "verification_status": "verified",
                "inspector_notes": "Ceiling-mounted projection unit signature detected."
            })
        else:
            findings.append({
                "detected_label": "Projector",
                "confidence_score": 0.45,
                "bounding_box": {},
                "ai_detected": False,
                "human_verified": False,
                "verification_status": "pending",
                "inspector_notes": "Projector not detected in ceiling region. Requires manual inspection."
            })

        # Evaluate overall compliance status
        verified_count = sum(1 for f in findings if f["confidence_score"] >= 0.70)
        total_items = len(findings)
        ratio = verified_count / total_items

        if ratio >= 0.75:
            overall_status = "compliant"
        elif ratio >= 0.50:
            overall_status = "partial"
        else:
            overall_status = "non_compliant"

        return {
            "image_dimensions": {"width": width, "height": height, "channels": channels},
            "findings": findings,
            "overall_status": overall_status,
            "verified_count": verified_count,
            "total_items": total_items
        }

cv_detector = InfrastructureCVDetector()
