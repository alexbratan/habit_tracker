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

    # opțional: nu permite duplicate la nume per user
    existing = await db.habits.find_one({
        "user_id": current_user["_id"],
        "name": habit.name
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

    result = await db.habits.update_one(
        {
            "_id": object_id,
            "user_id": current_user["_id"]
        },
        {"$set": {"is_active": False}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")

    return {"message": "Habit removed"}
