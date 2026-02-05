from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    default_duration: Optional[int] = Field(None, ge=1, description="Default duration in minutes")


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    default_duration: Optional[int] = Field(None, ge=1, description="Default duration in minutes")


class HabitResponse(BaseModel):
    id: str
    name: str
    default_duration: Optional[int] = None
    created_at: datetime
    user_id: str


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)


class HabitInDB(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    id: PyObjectId
    name: str
    default_duration: Optional[int] = None
    created_at: datetime
    user_id: str

    @classmethod
    def from_mongo_doc(cls, doc):
        return cls(
            id=doc["_id"],
            name=doc["name"],
            default_duration=doc.get("default_duration"),
            created_at=doc.get("created_at", doc["_id"].generation_time),
            user_id=str(doc["user_id"])
        )

    def to_response(self) -> HabitResponse:
        return HabitResponse(
            id=str(self.id),
            name=self.name,
            default_duration=self.default_duration,
            created_at=self.created_at,
            user_id=self.user_id
        )
