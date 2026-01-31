# Backwards compatibility - imports from utils.dependencies
# New code should import directly from utils.dependencies
from utils.dependencies import (
    get_current_user,
    oauth2_scheme,
    require_role,
    get_current_student,
    get_current_employer,
    get_current_admin
)
from db.session import get_db

__all__ = [
    "get_current_user",
    "oauth2_scheme", 
    "get_db",
    "require_role",
    "get_current_student",
    "get_current_employer",
    "get_current_admin"
]