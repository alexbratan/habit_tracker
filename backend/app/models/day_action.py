from pydantic import BaseModel
from typing import Literal

DayAction = Literal["reset", "skip", "done"]

class DayActionRequest(BaseModel):
    date: str  # YYYY-MM-DD
    action: DayAction
