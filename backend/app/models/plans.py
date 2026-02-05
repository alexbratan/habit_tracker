from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

PlanStatus = Literal["planned", "done", "skipped"]

class PlanCreate(BaseModel):
    habitId: str
    date: str  # "YYYY-MM-DD"
    plannedDuration: Optional[int] = None  # minute; dacă None, luăm din habit.defaultDuration

class PlanUpdate(BaseModel):
    status: Optional[PlanStatus] = None
    plannedDuration: Optional[int] = None
    actualDuration: Optional[int] = None

class PlanResponse(BaseModel):
    id: str
    habitId: str
    date: str
    status: PlanStatus
    plannedDuration: int
    actualDuration: Optional[int] = None
    createdAt: datetime
    completedAt: Optional[datetime] = None
