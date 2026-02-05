from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.user import UserCreate, UserResponse, UserUpdate, UserInDB, UserLogin, Token
from app.core.jwt import create_access_token
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("")
async def create_user(user: UserCreate):
    db = get_db()

    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Use the model method to create user with hashed password
    user_in_db = UserInDB.create_from_user_create(user)
    
    doc = {
        "email": user_in_db.email,
        "username": user_in_db.username,
        "password_hash": user_in_db.password_hash,
        "created_at": user_in_db.created_at
    }

    result = await db.users.insert_one(doc)

    return {
        "id": str(result.inserted_id),
        "email": user.email,
        "username": user.username
    }


@router.get("", response_model=list[UserResponse])
async def get_all_users():
    db = get_db()
    users = []
    async for user in db.users.find():
        users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            username=user.get("username"),
            created_at=user.get("created_at", user.get("_id").generation_time)
        ))
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str):
    db = get_db()
    
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = await db.users.find_one({"_id": object_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user.get("username"),
        created_at=user.get("created_at", user["_id"].generation_time)
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_update: UserUpdate):
    db = get_db()
    
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    existing_user = await db.users.find_one({"_id": object_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being updated and already exists
    if user_update.email and user_update.email != existing_user["email"]:
        email_exists = await db.users.find_one({"email": user_update.email})
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Prepare update data
    update_data = {}
    if user_update.username is not None:
        update_data["username"] = user_update.username
    if user_update.email is not None:
        update_data["email"] = user_update.email
    
    if update_data:
        await db.users.update_one({"_id": object_id}, {"$set": update_data})
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": object_id})
    
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        username=updated_user.get("username"),
        created_at=updated_user.get("created_at", updated_user["_id"].generation_time)
    )


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    db = get_db()
    
    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    result = await db.users.delete_one({"_id": object_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    db = get_db()
    
    # Find user by email
    user_doc = await db.users.find_one({"email": user_login.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create UserInDB instance to verify password
    user_in_db = UserInDB(
        email=user_doc["email"],
        username=user_doc.get("username"),
        password_hash=user_doc["password_hash"],
        created_at=user_doc.get("created_at", user_doc["_id"].generation_time)
    )
    
    # Verify password
    if not user_in_db.verify_password_method(user_login.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "access_token": create_access_token({"sub": user_doc["email"], "user_id": str(user_doc["_id"])}),
        "token_type": "bearer",
        "user": {
            "id": str(user_doc["_id"]),
            "email": user_doc["email"],
            "username": user_doc.get("username")
        }
    }


@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "username": current_user.get("username")
    }
