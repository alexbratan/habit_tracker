from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.core.security import get_current_user
from app.models.plans import PlanCreate, PlanUpdate, PlanResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/plans", tags=["Plans"])

DAY_LIMIT_MINUTES = 24 * 60

async def get_scheduled_total_minutes(db, user_id: ObjectId, date: str) -> int:
    pipeline = [
        {"$match": {"user_id": user_id, "date": date, "status": {"$ne": "skipped"}}},
        {"$group": {"_id": None, "total": {"$sum": "$plannedDuration"}}}
    ]
    res = await db.plans.aggregate(pipeline).to_list(length=1)
    return int(res[0]["total"]) if res else 0


@router.post("/schedule-habit", response_model=PlanResponse)
async def schedule_habit(plan: PlanCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Validate habitId
    try:
        habit_oid = ObjectId(plan.habitId)
    except:
        raise HTTPException(status_code=400, detail="Invalid habitId")

    # Habit must belong to user
    habit = await db.habits.find_one({"_id": habit_oid, "user_id": current_user["_id"], "is_active": True})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    # Resolve plannedDuration
    resolved_duration = plan.plannedDuration
    if resolved_duration is None:
        resolved_duration = habit.get("default_duration")

    if resolved_duration is None:
        raise HTTPException(status_code=400, detail="plannedDuration is required (habit has no defaultDuration)")

    if resolved_duration <= 0:
        raise HTTPException(status_code=400, detail="plannedDuration must be > 0")

    # Enforce 24h/day rule
    current_total = await get_scheduled_total_minutes(db, current_user["_id"], plan.date)
    if current_total + resolved_duration > DAY_LIMIT_MINUTES:
        raise HTTPException(
            status_code=400,
            detail=f"Daily plan limit exceeded: {current_total + resolved_duration}/{DAY_LIMIT_MINUTES} minutes"
        )

    # Prevent duplicates: same habit same date
    existing = await db.plans.find_one({"user_id": current_user["_id"], "habitId": habit_oid, "date": plan.date})
    if existing:
        raise HTTPException(status_code=400, detail="Habit already planned for this date")

    doc = {
        "user_id": current_user["_id"],
        "habitId": habit_oid,
        "date": plan.date,
        "status": "planned",
        "plannedDuration": int(resolved_duration),
        "actualDuration": None,
        "createdAt": datetime.utcnow(),
        "completedAt": None,
    }

    result = await db.plans.insert_one(doc)

    return PlanResponse(
        id=str(result.inserted_id),
        habitId=str(habit_oid),
        date=doc["date"],
        status=doc["status"],
        plannedDuration=doc["plannedDuration"],
        actualDuration=None,
        createdAt=doc["createdAt"],
        completedAt=None
    )


@router.get("", response_model=list[PlanResponse])
async def get_schedules(date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    plans = []

    async for p in db.plans.find({"user_id": current_user["_id"], "date": date}):
        plans.append(PlanResponse(
            id=str(p["_id"]),
            habitId=str(p["habitId"]),
            date=p["date"],
            status=p["status"],
            plannedDuration=p["plannedDuration"],
            actualDuration=p.get("actualDuration"),
            createdAt=p["createdAt"],
            completedAt=p.get("completedAt")
        ))

    return plans


@router.patch("/{plan_id}", response_model=PlanResponse)
async def update_schedule(plan_id: str, patch: PlanUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()

    try:
        plan_oid = ObjectId(plan_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid plan id")

    plan_doc = await db.plans.find_one({"_id": plan_oid, "user_id": current_user["_id"]})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="Plan not found")

    update = {}

    # If changing plannedDuration, enforce 24h/day rule (for that date)
    if patch.plannedDuration is not None:
        if patch.plannedDuration <= 0:
            raise HTTPException(status_code=400, detail="plannedDuration must be > 0")

        # compute total excluding this plan
        current_total = await get_scheduled_total_minutes(db, current_user["_id"], plan_doc["date"])
        current_total_excluding = current_total - int(plan_doc["plannedDuration"])

        # if plan is skipped, it wouldn't count; but we store plannedDuration anyway.
        # limit applies to non-skipped. If currently skipped and remains skipped, no need.
        new_status = patch.status if patch.status is not None else plan_doc["status"]
        if new_status != "skipped":
            if current_total_excluding + int(patch.plannedDuration) > DAY_LIMIT_MINUTES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Daily plan limit exceeded: {current_total_excluding + int(patch.plannedDuration)}/{DAY_LIMIT_MINUTES} minutes"
                )

        update["plannedDuration"] = int(patch.plannedDuration)

    # Status changes
    if patch.status is not None:
        if patch.status not in ("planned", "done", "skipped"):
            raise HTTPException(status_code=400, detail="Invalid status")

        # If switching from skipped -> planned/done, must re-check limit
        if plan_doc["status"] == "skipped" and patch.status != "skipped":
            current_total = await get_scheduled_total_minutes(db, current_user["_id"], plan_doc["date"])
            if current_total + int(update.get("plannedDuration", plan_doc["plannedDuration"])) > DAY_LIMIT_MINUTES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Daily plan limit exceeded: {current_total + int(update.get('plannedDuration', plan_doc['plannedDuration']))}/{DAY_LIMIT_MINUTES} minutes"
                )

        update["status"] = patch.status

        if patch.status == "done":
            update["completedAt"] = datetime.utcnow()
        elif patch.status != "done":
            update["completedAt"] = None

    # actualDuration (optional)
    if patch.actualDuration is not None:
        if patch.actualDuration < 0:
            raise HTTPException(status_code=400, detail="actualDuration must be >= 0")
        update["actualDuration"] = int(patch.actualDuration)

    if update:
        await db.plans.update_one({"_id": plan_oid}, {"$set": update})

    updated = await db.plans.find_one({"_id": plan_oid})
    return PlanResponse(
        id=str(updated["_id"]),
        habitId=str(updated["habitId"]),
        date=updated["date"],
        status=updated["status"],
        plannedDuration=updated["plannedDuration"],
        actualDuration=updated.get("actualDuration"),
        createdAt=updated["createdAt"],
        completedAt=updated.get("completedAt")
    )
