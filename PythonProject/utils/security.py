from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from .settings import settings

# Support both bcrypt and sha256_crypt for backwards compatibility
pwd_context = CryptContext(
    schemes=["bcrypt", "sha256_crypt"],
    deprecated="auto",
    default="sha256_crypt"
)


def get_password_hash(password: str) -> str:
    """Generate a secure hash for a password"""
    password_str = str(password)
    return pwd_context.hash(password_str)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash, handling edge cases"""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(str(plain_password), hashed_password)
    except Exception:
        # Handle bcrypt 5.0.0 compatibility issue
        import bcrypt
        if hashed_password.startswith('$2b$'):
            try:
                return bcrypt.checkpw(str(plain_password).encode(), hashed_password.encode())
            except Exception:
                return False
        return False


def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGO)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token"""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
