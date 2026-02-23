from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.core.security import get_current_user
from app.core.dates import weekday_from_yyyy_mm_dd

router = APIRouter(prefix="/daily-progress", tags=["Daily Progress"])

@router.get("/streak")
async def get_current_streak(current_user: dict = Depends(get_current_user)):
    """
    Calculate the current streak of consecutive days with 100% completion.
    A day counts as 100% complete if all non-skipped habits are marked as done.
    """
    db = get_db()
    
    # Get all overrides for the user, sorted by date
    overrides = []
    async for override in db.plan_overrides.find({"user_id": current_user["_id"]}).sort("date", -1):
        overrides.append(override)
    
    # Get weekly plans to calculate expected habits per day
    weekly_plans = {}
    async for wp in db.weekly_plans.find({"user_id": current_user["_id"], "is_active": True}):
        weekday = int(wp["weekday"])
        if weekday not in weekly_plans:
            weekly_plans[weekday] = []
        weekly_plans[weekday].append(wp)
    
    # Group overrides by date
    overrides_by_date = {}
    for override in overrides:
        date = override["date"]
        if date not in overrides_by_date:
            overrides_by_date[date] = []
        overrides_by_date[date].append(override)
    
    # Calculate completion percentage for each day
    daily_completion = {}
    for date, day_overrides in overrides_by_date.items():
        try:
            weekday = weekday_from_yyyy_mm_dd(date)
            day_plans = weekly_plans.get(weekday, [])
            
            if not day_plans:
                continue  # No habits planned for this day
            
            total_habits = len(day_plans)
            completed_habits = 0
            
            # Check each planned habit
            for plan in day_plans:
                plan_id = str(plan["_id"])
                override = next((o for o in day_overrides if str(o["weeklyPlanId"]) == plan_id), None)
                
                if override and override.get("status") == "done":
                    completed_habits += 1
                elif not override:  # No override means planned, not done
                    pass  # Not completed
                # Skipped habits don't count toward completion
            
            # Calculate completion percentage (only count non-skipped habits)
            non_skipped_overrides = [o for o in day_overrides if o.get("status") != "skipped"]
            expected_habits = len(day_plans)
            
            if expected_habits == 0:
                continue
                
            completion_rate = (completed_habits / expected_habits) * 100
            daily_completion[date] = completion_rate >= 100.0
            
        except Exception as e:
            print(f"Error processing date {date}: {e}")
            continue
    
    # Calculate current streak
    current_streak = 0
    today = datetime.utcnow().date()
    
    # Check each day going backwards from today
    for i in range(0, 365):  # Check up to a year back
        check_date = today - timedelta(days=i)
        date_str = check_date.isoformat()
        
        if date_str in daily_completion and daily_completion[date_str]:
            current_streak += 1
        else:
            break  # Streak broken
    
    # Calculate best streak
    best_streak = 0
    temp_streak = 0
    
    # Check all days in the past to find the longest streak
    for i in range(0, 365):  # Check up to a year back
        check_date = today - timedelta(days=i)
        date_str = check_date.isoformat()
        
        if date_str in daily_completion and daily_completion[date_str]:
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 0  # Reset temporary streak
    
    return {"current_streak": current_streak, "best_streak": best_streak}

@router.get("/history")
async def get_daily_progress_history(days: int = 30, current_user: dict = Depends(get_current_user)):
    """
    Get daily completion percentages for the last N days.
    """
    db = get_db()
    
    # Get all overrides for the user within the date range
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days-1)
    
    overrides = []
    async for override in db.plan_overrides.find({
        "user_id": current_user["_id"],
        "date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }).sort("date", 1):
        overrides.append(override)
    
    # Get weekly plans
    weekly_plans = {}
    async for wp in db.weekly_plans.find({"user_id": current_user["_id"], "is_active": True}):
        weekday = int(wp["weekday"])
        if weekday not in weekly_plans:
            weekly_plans[weekday] = []
        weekly_plans[weekday].append(wp)
    
    # Group overrides by date
    overrides_by_date = {}
    for override in overrides:
        date = override["date"]
        if date not in overrides_by_date:
            overrides_by_date[date] = []
        overrides_by_date[date].append(override)
    
    # Calculate completion for each day
    history = []
    for i in range(days):
        check_date = start_date + timedelta(days=i)
        date_str = check_date.isoformat()
        
        try:
            weekday = weekday_from_yyyy_mm_dd(date_str)
            day_plans = weekly_plans.get(weekday, [])
            
            if not day_plans:
                history.append({
                    "date": date_str,
                    "completion_percentage": 0,
                    "total_habits": 0,
                    "completed_habits": 0
                })
                continue
            
            total_habits = len(day_plans)
            completed_habits = 0
            total_minutes = 0
            completed_minutes = 0
            
            day_overrides = overrides_by_date.get(date_str, [])
            
            for plan in day_plans:
                plan_id = str(plan["_id"])
                override = next((o for o in day_overrides if str(o["weeklyPlanId"]) == plan_id), None)
                
                planned_duration = int(plan["plannedDuration"])
                total_minutes += planned_duration
                
                if override and override.get("status") == "done":
                    completed_habits += 1
                    completed_minutes += override.get("actualDuration", planned_duration)
                elif override and override.get("status") == "skipped":
                    # Skipped habits don't count toward total or completion
                    total_minutes -= planned_duration
                else:
                    # Planned but not done
                    pass
            
            completion_percentage = (completed_minutes / total_minutes * 100) if total_minutes > 0 else 0
            
            history.append({
                "date": date_str,
                "completion_percentage": round(completion_percentage, 1),
                "total_habits": total_habits,
                "completed_habits": completed_habits
            })
            
        except Exception as e:
            print(f"Error processing date {date_str}: {e}")
            history.append({
                "date": date_str,
                "completion_percentage": 0,
                "total_habits": 0,
                "completed_habits": 0
            })
    
    return {"history": history}
