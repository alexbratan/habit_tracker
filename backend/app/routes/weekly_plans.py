from fastapi import APIRouter, Depends, HTTPException
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

    # validate weekday
    if payload.weekday < 0 or payload.weekday > 6:
        raise HTTPException(status_code=400, detail="weekday must be in [0..6] (Mon=0..Sun=6)")

    # validate duration
    if payload.plannedDuration <= 0:
        raise HTTPException(status_code=400, detail="plannedDuration must be > 0")
    if payload.plannedDuration > DAY_LIMIT_MINUTES:
        raise HTTPException(status_code=400, detail="plannedDuration cannot exceed 1440 minutes")

    # parse habitId
    try:
        habit_oid = ObjectId(payload.habitId)
    except:
        raise HTTPException(status_code=400, detail="Invalid habitId")

    # habit must exist and belong to user
    habit = await db.habits.find_one({"_id": habit_oid, "user_id": current_user["_id"], "is_active": True})
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


@router.get("", response_model=list[WeeklyPlanResponse])
async def list_weekly_plans(
    weekday: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    query = {"user_id": current_user["_id"], "is_active": True}

    if weekday is not None:
        if weekday < 0 or weekday > 6:
            raise HTTPException(status_code=400, detail="weekday must be in [0..6] (Mon=0..Sun=6)")
        query["weekday"] = weekday

    out: list[WeeklyPlanResponse] = []
    cursor = db.weekly_plans.find(query).sort("createdAt", 1)

    async for wp in cursor:
        out.append(WeeklyPlanResponse(
            id=str(wp["_id"]),
            weekday=wp["weekday"],
            habitId=str(wp["habitId"]),
            plannedDuration=wp["plannedDuration"],
        ))

    return out


@router.delete("/{weekly_plan_id}")
async def delete_weekly_plan(
    weekly_plan_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    try:
        wp_oid = ObjectId(weekly_plan_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid weekly plan id")

    result = await db.weekly_plans.update_one(
        {"_id": wp_oid, "user_id": current_user["_id"], "is_active": True},
        {"$set": {"is_active": False}}
    )

    if result.matched_count == 0:
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

    # 1) Load weekly template items for that weekday
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

    # 3) Build resolved list (override wins)
    items = []
    for wp in templates:
        wp_id_str = str(wp["_id"])
        ov = overrides_by_weekly_plan_id.get(wp_id_str)

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
