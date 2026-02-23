from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.core.security import get_current_user
from app.models.habit import HabitCreate, HabitResponse, HabitUpdate
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/habits", tags=["Habits"])

@router.post("", response_model=HabitResponse)
async def create_habit(
    habit: HabitCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    # opțional: nu permite duplicate la nume per user, dar doar pentru active habits
    existing = await db.habits.find_one({
        "user_id": current_user["_id"],
        "name": habit.name,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="Habit already exists")

    doc = {
        "user_id": current_user["_id"],
        "name": habit.name,
        "default_duration": habit.default_duration,
        "created_at": datetime.utcnow(),
        "is_active": True
    }

    result = await db.habits.insert_one(doc)

    return HabitResponse(
        id=str(result.inserted_id),
        name=habit.name,
        default_duration=habit.default_duration,
        created_at=doc["created_at"],
        user_id=str(current_user["_id"])
    )

@router.get("", response_model=list[HabitResponse])
async def get_habits(current_user: dict = Depends(get_current_user)):
    db = get_db()
    habits = []

    async for habit in db.habits.find({
        "user_id": current_user["_id"],
        "is_active": True
    }):
        habits.append(HabitResponse(
            id=str(habit["_id"]),
            name=habit["name"],
            default_duration=habit.get("default_duration"),
            created_at=habit["created_at"],
            user_id=str(habit["user_id"])
        ))

    return habits

@router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    
    try:
        object_id = ObjectId(habit_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid habit ID")
    
    habit = await db.habits.find_one({
        "_id": object_id,
        "user_id": current_user["_id"],
        "is_active": True
    })
    
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    return HabitResponse(
        id=str(habit["_id"]),
        name=habit["name"],
        default_duration=habit.get("default_duration"),
        created_at=habit["created_at"],
        user_id=str(habit["user_id"])
    )

@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: str,
    habit_update: HabitUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    
    try:
        object_id = ObjectId(habit_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid habit ID")
    
    # Check if habit exists and belongs to user
    existing_habit = await db.habits.find_one({
        "_id": object_id,
        "user_id": current_user["_id"],
        "is_active": True
    })
    
    if not existing_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Prepare update data
    update_data = {}
    if habit_update.name is not None:
        # Check for duplicate name
        duplicate = await db.habits.find_one({
            "user_id": current_user["_id"],
            "name": habit_update.name,
            "_id": {"$ne": object_id}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="Habit with this name already exists")
        update_data["name"] = habit_update.name
    
    if habit_update.default_duration is not None:
        update_data["default_duration"] = habit_update.default_duration
    
    if update_data:
        await db.habits.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
    
    # Get updated habit
    updated_habit = await db.habits.find_one({"_id": object_id})
    
    return HabitResponse(
        id=str(updated_habit["_id"]),
        name=updated_habit["name"],
        default_duration=updated_habit.get("default_duration"),
        created_at=updated_habit["created_at"],
        user_id=str(updated_habit["user_id"])
    )

@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    try:
        object_id = ObjectId(habit_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid habit ID")

    # Get all weekly plans for this habit
    weekly_plans_cursor = db.weekly_plans.find({
        "user_id": current_user["_id"],
        "habitId": object_id
    })
    
    # Get all overrides for these weekly plans
    weekly_plan_ids = []
    async for wp in weekly_plans_cursor:
        weekly_plan_ids.append(wp["_id"])
    
    overrides_for_habit = []
    if weekly_plan_ids:
        async for ov in db.plan_overrides.find({
            "user_id": current_user["_id"],
            "weeklyPlanId": {"$in": weekly_plan_ids}
        }):
            overrides_for_habit.append(ov["weeklyPlanId"])
    
    # Delete only weekly plans that DON'T have overrides (planned instances only)
    weekly_plan_ids_with_overrides = set(overrides_for_habit)
    weekly_plans_to_delete = []
    for wp_id in weekly_plan_ids:
        if wp_id not in weekly_plan_ids_with_overrides:
            weekly_plans_to_delete.append(wp_id)
    
    deleted_plans_count = 0
    if weekly_plans_to_delete:
        result = await db.weekly_plans.delete_many({
            "_id": {"$in": weekly_plans_to_delete}
        })
        deleted_plans_count = result.deleted_count

    # Then, soft-delete the habit itself
    result = await db.habits.update_one(
        {
            "_id": object_id,
            "user_id": current_user["_id"]
        },
        {"$set": {"is_active": False}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")

    return {
        "message": "Habit removed",
        "deleted_weekly_plans": deleted_plans_count,
        "preserved_overrides": len(overrides_for_habit)
    }
