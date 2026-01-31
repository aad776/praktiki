from pydantic import BaseModel, EmailStr


class InstituteCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    institute_name: str
    aishe_code: str
    contact_number: str

