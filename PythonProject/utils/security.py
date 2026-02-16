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
        print("DEBUG: Hashed password is empty")
        return False
    try:
        # Try normal verification first
        result = pwd_context.verify(str(plain_password), hashed_password)
        if result:
            return True
        
        # If normal verification fails, check if it's a legacy bcrypt hash
        if hashed_password.startswith('$2'):
            print(f"DEBUG: Attempting bcrypt fallback for hash starting with {hashed_password[:5]}")
            try:
                import bcrypt
                return bcrypt.checkpw(str(plain_password).encode(), hashed_password.encode())
            except Exception as be:
                print(f"DEBUG: Bcrypt fallback error: {be}")
        
        # Fallback for sha256_crypt legacy hashes ($5$)
        if hashed_password.startswith('$5$'):
            print(f"DEBUG: Attempting sha256_crypt fallback for hash starting with {hashed_password[:5]}")
            try:
                from passlib.hash import sha256_crypt
                return sha256_crypt.verify(str(plain_password), hashed_password)
            except Exception as se:
                print(f"DEBUG: Sha256_crypt fallback error: {se}")
        
        print(f"DEBUG: Password verification failed for hash type: {pwd_context.identify(hashed_password)}")
        return False
    except Exception as e:
        print(f"DEBUG: Password verification exception: {e}")
        # Handle bcrypt compatibility issues ($2b$, $2a$, etc)
        if hashed_password.startswith('$2'):
            try:
                import bcrypt
                return bcrypt.checkpw(str(plain_password).encode(), hashed_password.encode())
            except Exception as be:
                print(f"DEBUG: Bcrypt fallback error: {be}")
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
