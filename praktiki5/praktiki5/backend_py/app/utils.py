from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Student
from app.auth import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    token = auth.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("email")
    if email is None:
        raise credentials_exception
        
    result = await db.execute(select(Student).where(Student.email == email))
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user
