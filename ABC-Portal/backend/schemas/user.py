from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "student"
    apaar_id: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.lower().strip()

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    identifier: str  # Can be email or APAAR ID
    password: str

class UserResponse(UserBase):
    id: int
    is_email_verified: bool
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StudentProfileResponse(BaseModel):
    id: int
    user: UserResponse
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
