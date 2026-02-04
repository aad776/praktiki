from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.student_profile import StudentProfile
from schemas.students import UserCreate, UserOut, LoginRequest
from utils.security import get_password_hash, verify_password, create_access_token
from schemas.employer import EmployerCreate
from models.employer_profile import EmployerProfile
from schemas.institute import InstituteCreate
from models.institute_profile import InstituteProfile
import time
import secrets
from datetime import datetime, timedelta
from pydantic import BaseModel
from utils.dependencies import get_current_user
from sqlalchemy import and_

router = APIRouter()


@router.post("/signup", response_model=UserOut)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if APAAR ID is already used (if provided)
    if user_in.apaar_id:
        apaar_exists = db.query(User).filter(User.apaar_id == user_in.apaar_id).first()
        if apaar_exists:
            raise HTTPException(status_code=400, detail="APAAR ID already registered")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role="student",
        is_email_verified=True,
        apaar_id=user_in.apaar_id,
        is_apaar_verified=False  # Will be verified separately
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if new_user.role == "student":
        new_profile = StudentProfile(
            user_id=new_user.id, 
            is_apaar_verified=False,
            full_name=new_user.full_name,
            apaar_id=user_in.apaar_id  # Store in profile as well
        )
        db.add(new_profile)
        db.commit()

    return new_user


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email using the verification token"""
    # Find user with the given verification token
    user = db.query(User).filter(User.verification_token == token).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check if token has expired
    if datetime.utcnow() > user.verification_token_expires:
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Mark email as verified and clear the token
    user.is_email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    
    return {"message": "Email verified successfully! You can now log in."}


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """Request a password reset token"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal that the email doesn't exist for security reasons
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate password reset token
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    
    # Use the same fields as verification token for simplicity
    user.verification_token = reset_token
    user.verification_token_expires = reset_token_expires
    db.commit()
    
    # In a real application, you would send an email with the reset link
    print(f"Password reset link for {user.email}: http://localhost:8000/auth/reset-password?token={reset_token}")
    
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """Reset password using the reset token"""
    # Find user with the given reset token
    user = db.query(User).filter(User.verification_token == token).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token has expired
    if datetime.utcnow() > user.verification_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password and clear the token
    user.hashed_password = get_password_hash(new_password)
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    
    return {"message": "Password has been reset successfully! You can now log in with your new password."}


@router.post("/login")
def login(
        login_in: LoginRequest,
        db: Session = Depends(get_db)
):
    print(f"Login attempt for email: {login_in.email}")
    print(f"Login request data: {login_in}")
    user = db.query(User).filter(User.email == login_in.email).first()
    print(f"User found: {user}")
    
    # Check if user exists and password is correct
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Email verification disabled for testing
    # if not user.is_email_verified:
    #     raise HTTPException(status_code=401, detail="Please verify your email before logging in")

    if user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        
        # Only update APAAR info if provided, but don't require it for login
        if login_in.apaar_id and profile:
            profile.apaar_id = login_in.apaar_id
            profile.is_apaar_verified = True
            db.commit()

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "is_email_verified": user.is_email_verified,
        "is_phone_verified": user.is_phone_verified
    }


# Employer Signup logic same rahega
@router.post("/signup/employer", response_model=UserOut)
def signup_employer(user_in: EmployerCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists: raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role="employer",
        is_email_verified=False, # Now mandatory
        is_phone_verified=False, # Now mandatory
        phone_number=user_in.contact_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_employer = EmployerProfile(
        user_id=new_user.id,
        company_name=user_in.company_name,
        contact_number=user_in.contact_number
    )
    db.add(new_employer)
    db.commit()

    return new_user

class OtpRequest(BaseModel):
    type: str  # "email" or "phone"

class OtpVerify(BaseModel):
    type: str  # "email" or "phone"
    code: str

@router.post("/request-otp")
def request_otp(
        req: OtpRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if req.type not in ("email", "phone"):
        raise HTTPException(status_code=400, detail="Invalid OTP type")
    
    # We can allow all roles to verify if needed, but the requirement focuses on employers
    
    code = "1234" # HARDCODED FOR DEMO/TESTING
    expires = datetime.utcnow() + timedelta(minutes=15)
    
    if req.type == "phone":
        if not current_user.phone_number:
             # Try to get from profile if not set on user
             if current_user.role == "employer" and current_user.employer_profile:
                 current_user.phone_number = current_user.employer_profile.contact_number
             else:
                 # If still not set, we can't send OTP, but for demo we'll allow it if provided in req or just use a dummy
                 current_user.phone_number = "1234567890" 
        
        current_user.phone_otp_code = code
        current_user.phone_otp_expires = expires
        db.commit()
        print(f"DEBUG: Phone OTP for {current_user.phone_number}: {code}")
        return {"message": "OTP sent to phone", "code": code}
    else:
        current_user.email_otp_code = code
        current_user.email_otp_expires = expires
        db.commit()
        print(f"DEBUG: Email OTP for {current_user.email}: {code}")
        return {"message": "OTP sent to email", "code": code}

@router.post("/verify-otp")
def verify_otp(
        req: OtpVerify,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if req.type not in ("email", "phone"):
        raise HTTPException(status_code=400, detail="Invalid OTP type")
    
    now = datetime.utcnow()
    if req.type == "phone":
        if not current_user.phone_otp_code or not current_user.phone_otp_expires:
            raise HTTPException(status_code=400, detail="No OTP requested")
        
        if now > current_user.phone_otp_expires or current_user.phone_otp_code != req.code:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        current_user.is_phone_verified = True
        # Phone verification status is stored on User model, not profile
            
        current_user.phone_otp_code = None
        current_user.phone_otp_expires = None
        db.commit()
        return {"message": "Phone verified", "is_phone_verified": True}
    else:
        if not current_user.email_otp_code or not current_user.email_otp_expires:
            raise HTTPException(status_code=400, detail="No OTP requested")
        
        if now > current_user.email_otp_expires or current_user.email_otp_code != req.code:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        current_user.is_email_verified = True
        # Also update the profile if it exists
        if current_user.employer_profile:
            current_user.employer_profile.is_verified = True # Map email/full verification to profile is_verified
            
        current_user.email_otp_code = None
        current_user.email_otp_expires = None
        db.commit()
        return {"message": "Email verified", "is_email_verified": True}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_email_verified": current_user.is_email_verified,
        "is_phone_verified": current_user.is_phone_verified
    }


@router.post("/signup/institute", response_model=UserOut)
def signup_institute(user_in: InstituteCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    aishe_exists = db.query(InstituteProfile).filter(InstituteProfile.aishe_code == user_in.aishe_code).first()
    if aishe_exists:
        raise HTTPException(status_code=400, detail="AISHE code already registered")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role="institute",
        is_email_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_institute = InstituteProfile(
        user_id=new_user.id,
        institute_name=user_in.institute_name,
        aishe_code=user_in.aishe_code,
        contact_number=user_in.contact_number
    )
    db.add(new_institute)
    db.commit()

    return new_user
