from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class InstituteCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    institute_name: str
    aishe_code: str
    contact_number: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.lower().strip()

class InstituteProfileUpdate(BaseModel):
    institute_name: Optional[str] = None
    contact_number: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    institute_type: Optional[str] = None
    state: Optional[str] = None

class InstituteProfileOut(BaseModel):
    id: int
    user_id: int
    institute_name: str
    aishe_code: str
    contact_number: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    is_verified: bool
    institute_type: Optional[str] = None
    state: Optional[str] = None

    class Config:
        from_attributes = True

