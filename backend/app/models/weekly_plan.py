from pydantic import BaseModel
from typing import Optional

class WeeklyPlanCreate(BaseModel):
    weekday: int          # 0=Mon .. 6=Sun
    habitId: str
    plannedDuration: int  # minutes

class WeeklyPlanUpdate(BaseModel):
    plannedDuration: int

class WeeklyPlanResponse(BaseModel):
    id: str
    weekday: int
    habitId: str
    plannedDuration: int
