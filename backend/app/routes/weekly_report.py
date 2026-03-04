from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.core.security import get_current_user
from app.core.dates import weekday_from_yyyy_mm_dd
from app.models.weekly_report import WeeklyReport, DailyStats

router = APIRouter(prefix="/weekly-report", tags=["Weekly Report"])


def get_week_start_end(date_str: Optional[str] = None) -> tuple[str, str]:
    """
    Get the start and end dates of a week (Monday to Sunday).
    If date_str is None, use current date.
    """
    if date_str is None:
        date = datetime.now()
    else:
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get Monday (start of week)
    monday = date - timedelta(days=date.weekday())
    # Get Sunday (end of week)
    sunday = monday + timedelta(days=6)
    
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


async def get_day_completion_data(db, user_id: ObjectId, date: str) -> DailyStats:
    """
    Get completion data for a specific day.
    """
    weekday = weekday_from_yyyy_mm_dd(date)
    
    # Load weekly template items for that weekday
    templates = []
    async for wp in db.weekly_plans.find({
        "user_id": user_id,
        "weekday": weekday,
        "is_active": True
    }):
        templates.append(wp)

    # Load overrides for that specific date
    overrides_by_weekly_plan_id = {}
    async for ov in db.plan_overrides.find({
        "user_id": user_id,
        "date": date
    }):
        overrides_by_weekly_plan_id[str(ov["weeklyPlanId"])] = ov

    # Also load inactive weekly plans that have overrides for this date
    weekly_plan_ids_with_overrides = list(overrides_by_weekly_plan_id.keys())
    if weekly_plan_ids_with_overrides:
        async for wp in db.weekly_plans.find({
            "_id": {"$in": [ObjectId(wp_id) for wp_id in weekly_plan_ids_with_overrides]},
            "user_id": user_id,
            "weekday": weekday,
            "is_active": False
        }):
            templates.append(wp)

    # Calculate planned and actual minutes
    total_planned = 0
    total_actual = 0

    for wp in templates:
        wp_id_str = str(wp["_id"])
        ov = overrides_by_weekly_plan_id.get(wp_id_str)
        
        # Get planned duration
        if ov and ov.get("plannedDuration") is not None:
            planned_duration = int(ov["plannedDuration"])
        else:
            planned_duration = int(wp["plannedDuration"])
        
        # Get status and actual duration
        status = "planned"
        actual_duration = None
        
        if ov:
            status = ov.get("status", "planned")
            actual_duration = ov.get("actualDuration")
        
        # Count all items (planned, done, skipped) for planned minutes
        total_planned += planned_duration
        
        # Count actual minutes for done items only
        if status == "done" and actual_duration is not None:
            total_actual += int(actual_duration)
        elif status == "done":
            # If marked as done but no actual duration, use planned duration
            total_actual += planned_duration

    # Calculate completion percentage
    completion_percentage = 0.0
    if total_planned > 0:
        completion_percentage = (total_actual / total_planned) * 100
    elif total_planned == 0:
        completion_percentage = 100.0  # No tasks planned = 100% complete

    is_100_percent = completion_percentage >= 100.0

    return DailyStats(
        date=date,
        weekday=weekday,
        totalPlannedMinutes=total_planned,
        totalActualMinutes=total_actual,
        completionPercentage=round(completion_percentage, 2),
        is100PercentComplete=is_100_percent
    )


@router.get("", response_model=WeeklyReport)
async def get_weekly_report(
    date: Optional[str] = Query(None, description="Date within the week (YYYY-MM-DD). Defaults to today."),
    current_user: dict = Depends(get_current_user)
):
    """
    Get weekly completion report showing:
    - How many days had 100% completion
    - Average daily completion percentage
    - Daily breakdown of planned vs actual minutes
    """
    db = get_db()
    
    # Get week start and end dates
    week_start, week_end = get_week_start_end(date)
    
    # Generate all dates in the week
    start_date = datetime.strptime(week_start, "%Y-%m-%d")
    daily_stats = []
    
    for i in range(7):  # 7 days in a week
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")
        
        day_stats = await get_day_completion_data(db, current_user["_id"], date_str)
        daily_stats.append(day_stats)
    
    # Calculate weekly statistics
    days_at_100_percent = sum(1 for day in daily_stats if day.is100PercentComplete)
    average_daily_completion = sum(day.completionPercentage for day in daily_stats) / 7
    
    return WeeklyReport(
        weekStart=week_start,
        weekEnd=week_end,
        totalDays=7,
        daysAt100Percent=days_at_100_percent,
        averageDailyCompletion=round(average_daily_completion, 2),
        dailyStats=daily_stats
    )
