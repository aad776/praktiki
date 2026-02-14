from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.database import get_db
from backend.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password: str, hashed_password: str):
    try:
        # Standard bcrypt check
        if bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8')):
            return True
    except Exception:
        pass
        
    # Fallback for sha256_crypt legacy hashes ($5$)
    if hashed_password.startswith('$5$'):
        try:
            from passlib.hash import sha256_crypt
            return sha256_crypt.verify(str(plain_password), hashed_password)
        except Exception as se:
            print(f"DEBUG: ABC Portal Sha256_crypt fallback error: {se}")
            
    return False

def get_password_hash(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Try both 'sub' formats: email (ABC Portal) or user_id (Praktiki)
        subject: str = payload.get("sub")
        if subject is None:
            raise credentials_exception
            
        # Check if subject is an email or numeric ID
        if "@" in subject:
            user = db.query(User).filter(User.email == subject).first()
        else:
            try:
                user_id = int(subject)
                user = db.query(User).filter(User.id == user_id).first()
            except ValueError:
                user = db.query(User).filter(User.email == subject).first()
    except JWTError:
        raise credentials_exception
    
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user
