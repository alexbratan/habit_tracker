from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.core.security import hash_password, verify_password


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

    def hash_password_method(self) -> str:
        """Hash the password using bcrypt"""
        return hash_password(self.password)


class UserInDB(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def create_from_user_create(cls, user_create: 'UserCreate') -> 'UserInDB':
        """Create UserInDB from UserCreate with hashed password"""
        return cls(
            email=user_create.email,
            username=user_create.username,
            password_hash=user_create.hash_password_method()
        )

    def verify_password_method(self, password: str) -> bool:
        """Verify if the provided password matches the stored hash"""
        return verify_password(password, self.password_hash)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: Optional[str] = None
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
