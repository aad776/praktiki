from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session
from .settings import settings
from db.session import get_db as _get_db
from models.user import User

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    """Database session dependency"""
    return _get_db()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(_get_db)):
    """Get the currently authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(allowed_roles: list[str]):
    """Dependency factory for role-based access control"""
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource"
            )
        return user
    return role_checker


# Convenience dependencies for specific roles
def get_current_student(user: User = Depends(get_current_user)):
    """Ensure current user is a student"""
    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return user


def get_current_employer(user: User = Depends(get_current_user)):
    """Ensure current user is an employer"""
    if user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employer access required"
        )
    return user


def get_current_admin(user: User = Depends(get_current_user)):
    """Ensure current user is an admin"""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user
