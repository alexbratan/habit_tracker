from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

OverrideStatus = Literal["planned", "done", "skipped"]

class OverrideUpsert(BaseModel):
    date: str                 # "YYYY-MM-DD"
    weeklyPlanId: str
    status: Optional[OverrideStatus] = None
    plannedDuration: Optional[int] = None   # override doar pentru ziua asta
    actualDuration: Optional[int] = None
    note: Optional[str] = None

class OverrideResponse(BaseModel):
    id: str
    date: str
    weeklyPlanId: str
    status: OverrideStatus
    plannedDuration: Optional[int] = None
    actualDuration: Optional[int] = None
    note: Optional[str] = None
    createdAt: datetime
    completedAt: Optional[datetime] = None
