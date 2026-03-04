from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta, date as date_cls
from typing import Optional

from app.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/week-view", tags=["Week View"])

def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")

def monday_of_week(d: date_cls) -> date_cls:
    # Mon=0..Sun=6
    return d - timedelta(days=d.weekday())

@router.get("")
async def week_view(start: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    Returns 7 days (Mon..Sun) resolved view.
    - If `start` provided, it must be a Monday (YYYY-MM-DD).
    - If omitted, uses the current week (Mon..Sun) based on server date.
    """
    db = get_db()
    user_id = current_user["_id"]

    # Determine start Monday
    if start is None:
        today = datetime.utcnow().date()
        start_date = monday_of_week(today)
    else:
        try:
            start_dt = parse_date(start).date()
        except:
            raise HTTPException(status_code=400, detail="Invalid start date format. Use YYYY-MM-DD")
        # Calculate the Monday of the week containing the provided date
        start_date = monday_of_week(start_dt)

    # Build date strings for Mon..Sun
    dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    # Preload weekly templates grouped by weekday (include inactive for historical data)
    templates_by_weekday = {i: [] for i in range(7)}
    all_habit_ids = set()
    async for wp in db.weekly_plans.find({"user_id": user_id}):
        templates_by_weekday[int(wp["weekday"])].append(wp)
        all_habit_ids.add(wp["habitId"])

    # Preload all habits needed for the week
    habits = {}
    if all_habit_ids:
        async for habit in db.habits.find({"_id": {"$in": list(all_habit_ids)}}):
            habits[str(habit["_id"])] = habit

    # Preload overrides for the whole week
    overrides_by_date = {d: {} for d in dates}
    async for ov in db.plan_overrides.find({"user_id": user_id, "date": {"$in": dates}}):
        overrides_by_date[ov["date"]][str(ov["weeklyPlanId"])] = ov

    days = []
    for weekday in range(7):
        date_str = dates[weekday]
        templates = templates_by_weekday.get(weekday, [])
        overrides_map = overrides_by_date.get(date_str, {})

        items = []
        counts = {"planned": 0, "done": 0, "skipped": 0}
        total_planned = 0

        for wp in templates:
            wp_id_str = str(wp["_id"])
            ov = overrides_map.get(wp_id_str)
            
            # Skip inactive weekly plans unless they have overrides
            if not wp.get("is_active", True) and not ov:
                continue
                
            habit = habits.get(str(wp["habitId"]))
            habit_name = habit["name"] if habit else "Unknown Habit"

            planned_duration = int(wp["plannedDuration"])
            status = "planned"
            actual_duration = None
            note = None
            source = "template"
            override_id = None

            if ov:
                source = "override"
                override_id = str(ov["_id"])
                status = ov.get("status", status)
                
                # Skip removed instances
                if status == "removed":
                    continue
                    
                if ov.get("plannedDuration") is not None:
                    planned_duration = int(ov["plannedDuration"])
                actual_duration = ov.get("actualDuration")
                note = ov.get("note")

            items.append({
                "weeklyPlanId": wp_id_str,
                "overrideId": override_id,
                "date": date_str,
                "weekday": weekday,
                "habitId": str(wp["habitId"]),
                "habitName": habit_name,
                "plannedDuration": planned_duration,
                "status": status,
                "actualDuration": actual_duration,
                "note": note,
                "source": source
            })

            if status == "skipped":
                counts["skipped"] += 1
            elif status == "done":
                counts["done"] += 1
                total_planned += planned_duration
            else:
                counts["planned"] += 1
                total_planned += planned_duration

        days.append({
            "date": date_str,
            "weekday": weekday,
            "totalPlannedMinutes": total_planned,
            "counts": counts,
            "items": items
        })

    return {"start": start_date.strftime("%Y-%m-%d"), "days": days}
