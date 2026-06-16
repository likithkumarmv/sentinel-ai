from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class InterviewBase(BaseModel):
    score: Optional[float] = None
    transcript: Optional[str] = None
    feedback: Optional[str] = None

class InterviewCreate(InterviewBase):
    user_id: int

class Interview(InterviewBase):
    id: int
    user_id: int
    timestamp: datetime
    class Config:
        from_attributes = True
