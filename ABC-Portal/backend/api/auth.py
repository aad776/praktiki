from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi.security import OAuth2PasswordRequestForm
from backend.database import get_db
from backend.models.user import User, LoginHistory
from backend.schemas.user import UserCreate, UserResponse, Token
from backend.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Login with Email or APAAR ID
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == func.lower(form_data.username),
            User.apaar_id == form_data.username
        )
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/APAAR ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.role not in ["student", "institute"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students and institutes can access the ABC Portal",
        )
    
    # Record login history
    login_record = LoginHistory(user_id=user.id)
    db.add(login_record)
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
