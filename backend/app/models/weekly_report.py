from pydantic import BaseModel
from typing import List, Optional

class DailyStats(BaseModel):
    date: str
    weekday: int
    totalPlannedMinutes: int
    totalActualMinutes: int
    completionPercentage: float
    is100PercentComplete: bool

class WeeklyReport(BaseModel):
    weekStart: str
    weekEnd: str
    totalDays: int
    daysAt100Percent: int
    averageDailyCompletion: float
    dailyStats: List[DailyStats]
