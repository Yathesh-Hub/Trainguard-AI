from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ReportMetadata(BaseModel):
    report_type: str
    centre_id: Optional[str] = None
    centre_name: Optional[str] = None
    generated_at: str
    file_name: str
    download_url: str
    summary: Dict[str, Any] = {}
