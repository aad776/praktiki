from fastapi import APIRouter
from .auth import router as auth_router
from .student import router as student_router
from .company import router as company_router
from .institute import router as institute_router
from .admin import router as admin_router
from .analytics import router as analytics_router
from .notifications import router as notifications_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(student_router)
api_router.include_router(company_router)
api_router.include_router(institute_router)
api_router.include_router(admin_router)
api_router.include_router(analytics_router)
api_router.include_router(notifications_router)
