from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.core.security import get_current_user
from app.core.dates import weekday_from_yyyy_mm_dd
from app.models.weekly_plan import WeeklyPlanCreate, WeeklyPlanUpdate, WeeklyPlanResponse

router = APIRouter(prefix="/weekly-plans", tags=["Weekly Plans"])

DAY_LIMIT_MINUTES = 24 * 60

async def weekday_total_minutes(db, user_id: ObjectId, weekday: int) -> int:
    pipeline = [
        {"$match": {"user_id": user_id, "weekday": weekday, "is_active": True}},
        {"$group": {"_id": None, "total": {"$sum": "$plannedDuration"}}},
    ]
    res = await db.weekly_plans.aggregate(pipeline).to_list(length=1)
    return int(res[0]["total"]) if res else 0


@router.post("", response_model=WeeklyPlanResponse)
async def create_weekly_plan(
    payload: WeeklyPlanCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    
    # Debug logging
    print(f"DEBUG: Received payload: {payload}")
    print(f"DEBUG: User ID: {current_user['_id']}")

    # validate weekday
    if payload.weekday < 0 or payload.weekday > 6:
        print(f"DEBUG: Invalid weekday: {payload.weekday}")
        raise HTTPException(status_code=400, detail="weekday must be in [0..6] (Mon=0..Sun=6)")

    # validate duration
    if payload.plannedDuration <= 0:
        print(f"DEBUG: Invalid duration (<=0): {payload.plannedDuration}")
        raise HTTPException(status_code=400, detail="plannedDuration must be > 0")
    if payload.plannedDuration > DAY_LIMIT_MINUTES:
        print(f"DEBUG: Invalid duration (>1440): {payload.plannedDuration}")
        raise HTTPException(status_code=400, detail="plannedDuration cannot exceed 1440 minutes")

    # parse habitId
    try:
        habit_oid = ObjectId(payload.habitId)
        print(f"DEBUG: Parsed habit ObjectId: {habit_oid}")
    except Exception as e:
        print(f"DEBUG: Invalid habitId format: {payload.habitId}, error: {e}")
        raise HTTPException(status_code=400, detail="Invalid habitId")

    # habit must exist and belong to user
    habit = await db.habits.find_one({"_id": habit_oid, "user_id": current_user["_id"], "is_active": True})
    print(f"DEBUG: Found habit: {habit}")
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    # no duplicates (same habit already in template for that weekday)
    existing = await db.weekly_plans.find_one({
        "user_id": current_user["_id"],
        "weekday": payload.weekday,
        "habitId": habit_oid,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="Habit already exists in this weekday template")

    # enforce 24h limit per weekday template
    current_total = await weekday_total_minutes(db, current_user["_id"], payload.weekday)
    if current_total + payload.plannedDuration > DAY_LIMIT_MINUTES:
        raise HTTPException(
            status_code=400,
            detail=f"Weekday template limit exceeded: {current_total + payload.plannedDuration}/{DAY_LIMIT_MINUTES} minutes"
        )

    doc = {
        "user_id": current_user["_id"],
        "weekday": payload.weekday,
        "habitId": habit_oid,
        "plannedDuration": int(payload.plannedDuration),
        "createdAt": datetime.utcnow(),
        "is_active": True,
    }

    result = await db.weekly_plans.insert_one(doc)

    return WeeklyPlanResponse(
        id=str(result.inserted_id),
        weekday=doc["weekday"],
        habitId=str(doc["habitId"]),
        plannedDuration=doc["plannedDuration"],
    )


@router.get("")
async def list_weekly_plans(
    weekday: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    query = {"user_id": current_user["_id"], "is_active": True}
    
    # Also include inactive habits to preserve historical data
    # This allows frontend to see all weekly plans including those for deleted habits
    if weekday is None:
        # Only for the main list - include both active and inactive
        query = {"user_id": current_user["_id"]}

    if weekday is not None:
        if weekday < 0 or weekday > 6:
            raise HTTPException(status_code=400, detail="weekday must be in [0..6] (Mon=0..Sun=6)")
        query["weekday"] = weekday

    # Get all weekly plans
    weekly_plans_list = []
    cursor = db.weekly_plans.find(query).sort("createdAt", 1)

    async for wp in cursor:
        weekly_plans_list.append(wp)

    # Get all habit IDs and fetch habits in batch
    habit_ids = [wp["habitId"] for wp in weekly_plans_list]
    habits = {}
    if habit_ids:
        async for habit in db.habits.find({"_id": {"$in": habit_ids}}):
            habits[str(habit["_id"])] = habit

    # Build response with habit names
    out = []
    for wp in weekly_plans_list:
        habit = habits.get(str(wp["habitId"]))
        habit_name = habit["name"] if habit else "Unknown Habit"
        
        out.append({
            "id": str(wp["_id"]),
            "weekday": wp["weekday"],
            "habitId": str(wp["habitId"]),
            "habitName": habit_name,
            "plannedDuration": wp["plannedDuration"],
        })

    return out


@router.delete("/{weekly_plan_id}")
async def delete_weekly_plan(
    weekly_plan_id: str,
    current_user: dict = Depends(get_current_user),
    date: Optional[str] = Query(None, description="Specific date to remove instance from"),  # Optional date parameter for specific instance deletion
):
    db = get_db()

    try:
        wp_oid = ObjectId(weekly_plan_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid weekly plan id")

    # Get the weekly plan to check for past overrides
    weekly_plan = await db.weekly_plans.find_one({"_id": wp_oid, "user_id": current_user["_id"]})
    if not weekly_plan:
        raise HTTPException(status_code=404, detail="Weekly plan not found")

    # Check if there are any past overrides (done/skipped instances)
    past_overrides_exist = await db.plan_overrides.find_one({
        "weeklyPlanId": weekly_plan_id,
        "user_id": current_user["_id"],
        "status": {"$in": ["done", "skipped"]}
    })

    if past_overrides_exist and date:
        # If there are past instances and this is a specific date deletion,
        # create an override to remove this specific instance only
        override_doc = {
            "user_id": current_user["_id"],
            "weeklyPlanId": weekly_plan_id,
            "date": date,
            "status": "removed",  # New status to indicate removed instance
            "created_at": datetime.utcnow()
        }
        
        # Upsert the override (create or update)
        await db.plan_overrides.update_one(
            {"weeklyPlanId": weekly_plan_id, "date": date, "user_id": current_user["_id"]},
            {"$set": override_doc},
            upsert=True
        )
        
        return {"message": "Instance removed from specific date"}
    
    elif past_overrides_exist:
        # If there are past instances but no specific date, deactivate the template
        # but keep it for historical data
        result = await db.weekly_plans.update_one(
            {"_id": wp_oid, "user_id": current_user["_id"]},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Weekly plan not found")
            
        return {"message": "Template deactivated (past instances preserved)"}
    
    else:
        # No past instances, safe to delete the entire template
        result = await db.weekly_plans.delete_one(
            {"_id": wp_oid, "user_id": current_user["_id"]}
        )

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        return {"message": "Removed from weekly template"}


@router.patch("/{weekly_plan_id}", response_model=WeeklyPlanResponse)
async def update_weekly_plan_duration(
    weekly_plan_id: str,
    payload: WeeklyPlanUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    if payload.plannedDuration <= 0:
        raise HTTPException(status_code=400, detail="plannedDuration must be > 0")
    if payload.plannedDuration > DAY_LIMIT_MINUTES:
        raise HTTPException(status_code=400, detail="plannedDuration cannot exceed 1440 minutes")

    try:
        wp_oid = ObjectId(weekly_plan_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid weekly plan id")

    # Load existing item (must belong to user)
    wp = await db.weekly_plans.find_one(
        {"_id": wp_oid, "user_id": current_user["_id"], "is_active": True}
    )
    if not wp:
        raise HTTPException(status_code=404, detail="Weekly plan not found")

    weekday = int(wp["weekday"])
    old_duration = int(wp["plannedDuration"])

    # Enforce weekday total limit: total - old + new <= 1440
    current_total = await weekday_total_minutes(db, current_user["_id"], weekday)
    new_total = current_total - old_duration + int(payload.plannedDuration)

    if new_total > DAY_LIMIT_MINUTES:
        raise HTTPException(
            status_code=400,
            detail=f"Weekday template limit exceeded: {new_total}/{DAY_LIMIT_MINUTES} minutes"
        )

    await db.weekly_plans.update_one(
        {"_id": wp_oid},
        {"$set": {"plannedDuration": int(payload.plannedDuration)}}
    )

    updated = await db.weekly_plans.find_one({"_id": wp_oid})

    return WeeklyPlanResponse(
        id=str(updated["_id"]),
        weekday=updated["weekday"],
        habitId=str(updated["habitId"]),
        plannedDuration=updated["plannedDuration"],
    )


@router.get("/resolved")
async def resolved_day(date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()

    # validate date
    try:
        weekday = weekday_from_yyyy_mm_dd(date)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # 1) Load weekly template items for that weekday (only active ones)
    templates = []
    async for wp in db.weekly_plans.find({
        "user_id": current_user["_id"],
        "weekday": weekday,
        "is_active": True
    }):
        templates.append(wp)

    # 2) Load overrides for that specific date (keyed by weeklyPlanId)
    overrides_by_weekly_plan_id = {}
    async for ov in db.plan_overrides.find({
        "user_id": current_user["_id"],
        "date": date
    }):
        overrides_by_weekly_plan_id[str(ov["weeklyPlanId"])] = ov

    # 2.5) Also load inactive weekly plans that have overrides for this date
    # This ensures done/skipped instances of deleted habits still show up
    weekly_plan_ids_with_overrides = list(overrides_by_weekly_plan_id.keys())
    if weekly_plan_ids_with_overrides:
        async for wp in db.weekly_plans.find({
            "_id": {"$in": [ObjectId(wp_id) for wp_id in weekly_plan_ids_with_overrides]},
            "user_id": current_user["_id"],
            "weekday": weekday,
            "is_active": False  # Only inactive ones that weren't included above
        }):
            templates.append(wp)

    # 3) Get habit names for all habits in templates (including inactive ones for historical data)
    habit_ids = [wp["habitId"] for wp in templates]
    habits = {}
    if habit_ids:
        # Convert ObjectId habitIds to strings for lookup
        habit_ids_str = [str(hid) if isinstance(hid, ObjectId) else hid for hid in habit_ids]
        print(f"DEBUG: Looking for habit IDs: {habit_ids_str}")
        
        # Include both active and inactive habits to preserve historical data
        async for habit in db.habits.find({"_id": {"$in": habit_ids}}):
            habits[str(habit["_id"])] = habit
            print(f"DEBUG: Found habit: {habit['_id']} -> {habit['name']}")
        
        print(f"DEBUG: Total habits found: {len(habits)}")

    # 4) Build resolved list (override wins)
    items = []
    for wp in templates:
        wp_id_str = str(wp["_id"])
        ov = overrides_by_weekly_plan_id.get(wp_id_str)
        habit_id_str = str(wp["habitId"])
        habit = habits.get(habit_id_str)
        habit_name = habit["name"] if habit else "Unknown Habit"
        
        print(f"DEBUG: WeeklyPlan {wp_id_str} -> HabitID {habit_id_str} -> Found: {habit is not None} -> Name: {habit_name}")

        # base from template
        planned_duration = int(wp["plannedDuration"])
        status = "planned"
        actual_duration = None
        note = None
        source = "template"
        override_id = None

        # apply override if exists
        if ov:
            source = "override"
            override_id = str(ov["_id"])
            status = ov.get("status", status)
            if ov.get("plannedDuration") is not None:
                planned_duration = int(ov["plannedDuration"])
            actual_duration = ov.get("actualDuration")
            note = ov.get("note")

        items.append({
            "weeklyPlanId": wp_id_str,
            "overrideId": override_id,
            "date": date,
            "weekday": weekday,
            "habitId": str(wp["habitId"]),
            "habitName": habit_name,
            "plannedDuration": planned_duration,
            "status": status,
            "actualDuration": actual_duration,
            "note": note,
            "source": source
        })

    # handy totals for UI
    total_planned = sum(i["plannedDuration"] for i in items if i["status"] != "skipped")

    return {
        "date": date,
        "weekday": weekday,
        "totalPlannedMinutes": total_planned,
        "items": items
    }
