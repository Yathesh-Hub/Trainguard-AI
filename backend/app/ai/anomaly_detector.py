import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger("trainguard.ai.anomaly")

class AttendanceAnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination

    def detect_attendance_anomalies(
        self,
        centre_id: str,
        attendance_records: List[Dict[str, Any]],
        trainer_records: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyzes attendance records using Scikit-Learn Isolation Forest and statistical heuristic tests.
        Returns detected anomaly records ready for storage.
        """
        if not attendance_records:
            return []

        df = pd.DataFrame(attendance_records)
        df['date'] = pd.to_datetime(df['date'])
        anomalies = []

        # 1. Daily batch-level time-series analysis for Sudden Drops & Fluctuations
        daily_summary = df.groupby(['date', 'batch_id']).agg(
            total=('id', 'count'),
            present=('status', lambda s: (s == 'present').sum()),
            late=('status', lambda s: (s == 'late').sum())
        ).reset_index()

        daily_summary['rate'] = ((daily_summary['present'] + daily_summary['late'] * 0.5) / daily_summary['total']) * 100

        # Sort chronologically
        daily_summary = daily_summary.sort_values('date')

        # Run Isolation Forest if enough observations
        if len(daily_summary) >= 6:
            try:
                features = daily_summary[['rate', 'total']].copy()
                features['rolling_mean'] = daily_summary['rate'].rolling(window=3, min_periods=1).mean()
                features['diff_from_rolling'] = features['rate'] - features['rolling_mean']

                clf = IsolationForest(contamination=self.contamination, random_state=42)
                preds = clf.fit_predict(features[['rate', 'diff_from_rolling']])
                daily_summary['is_anomaly'] = preds == -1

                for _, row in daily_summary[daily_summary['is_anomaly']].iterrows():
                    diff = float(row['diff_from_rolling'])
                    if diff < -20: # Drop > 20%
                        severity = 'critical' if diff < -35 else 'high'
                        anomalies.append({
                            "centre_id": centre_id,
                            "category": "attendance_drop",
                            "description": f"Significant attendance drop of {abs(diff):.1f}% below rolling trend on {row['date'].strftime('%Y-%m-%d')}",
                            "severity": severity,
                            "anomaly_date": row['date'].strftime('%Y-%m-%d'),
                            "evidence": {
                                "batch_id": row['batch_id'],
                                "rate_observed": round(float(row['rate']), 1),
                                "expected_rolling": round(float(row['rolling_mean']), 1),
                                "variance": round(diff, 1),
                                "method": "IsolationForest_ML"
                            },
                            "review_status": "open"
                        })
            except Exception as e:
                logger.warning("Isolation Forest exception: %s", e)

        # 2. Check for Identical Attendance Patterns across consecutive dates
        # Suspicious if exact same subset of students is marked present with zero variance over 4+ days
        pivoted = df.pivot_table(index='student_id', columns='date', values='status', aggfunc='first')
        if pivoted.shape[1] >= 4:
            # Check consecutive day identity
            cols = list(pivoted.columns)
            for i in range(len(cols) - 3):
                subset = pivoted[cols[i:i+4]]
                # Count non-null matching patterns
                all_equal = (subset.nunique(axis=1) == 1) & subset.iloc[:, 0].notna()
                matching_count = int(all_equal.sum())
                if matching_count >= 15: # 15+ students had identical status for 4 straight days
                    anomalies.append({
                        "centre_id": centre_id,
                        "category": "identical_patterns",
                        "description": f"Suspicious identical attendance pattern: {matching_count} students showed zero status variation across 4 consecutive days ({cols[i].strftime('%Y-%m-%d')} to {cols[i+3].strftime('%Y-%m-%d')})",
                        "severity": "critical",
                        "anomaly_date": cols[i+3].strftime('%Y-%m-%d'),
                        "evidence": {
                            "matching_students_count": matching_count,
                            "window_start": cols[i].strftime('%Y-%m-%d'),
                            "window_end": cols[i+3].strftime('%Y-%m-%d'),
                            "identical_run_days": 4
                        },
                        "review_status": "open"
                    })
                    break # Don't flood with sub-windows

        # 3. Trainer vs Student Attendance Discrepancy
        if trainer_records:
            tdf = pd.DataFrame(trainer_records)
            tdf['date'] = pd.to_datetime(tdf['date'])
            for _, trow in tdf.iterrows():
                t_date = trow['date']
                t_status = trow.get('status')
                t_hrs = float(trow.get('session_hours', 0))

                # Check if students attended on this date
                day_students = df[df['date'] == t_date]
                if t_status == 'present' and t_hrs >= 2.0 and len(day_students) == 0:
                    anomalies.append({
                        "centre_id": centre_id,
                        "category": "trainer_discrepancy",
                        "description": f"Trainer {trow.get('trainer_id')} logged {t_hrs} hours on {t_date.strftime('%Y-%m-%d')} but 0 student records were recorded for the centre",
                        "severity": "medium",
                        "anomaly_date": t_date.strftime('%Y-%m-%d'),
                        "evidence": {
                            "trainer_id": trow.get('trainer_id'),
                            "hours_logged": t_hrs,
                            "student_logs_count": 0
                        },
                        "review_status": "open"
                    })
                elif t_status in ('absent', 'on_leave') and len(day_students) > 10:
                    present_students = (day_students['status'] == 'present').sum()
                    if present_students > 10:
                        anomalies.append({
                            "centre_id": centre_id,
                            "category": "trainer_discrepancy",
                            "description": f"Trainer marked absent on {t_date.strftime('%Y-%m-%d')} yet {present_students} students marked present",
                            "severity": "high",
                            "anomaly_date": t_date.strftime('%Y-%m-%d'),
                            "evidence": {
                                "trainer_id": trow.get('trainer_id'),
                                "trainer_status": t_status,
                                "students_present": int(present_students)
                            },
                            "review_status": "open"
                        })

        return anomalies
