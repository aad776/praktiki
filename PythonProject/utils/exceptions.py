from fastapi import HTTPException, status


class CredentialsException(HTTPException):
    """Exception for authentication failures"""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class NotFoundException(HTTPException):
    """Exception for resource not found errors"""
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )


class ForbiddenException(HTTPException):
    """Exception for access denied errors"""
    def __init__(self, detail: str = "You don't have permission to access this resource"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class BadRequestException(HTTPException):
    """Exception for bad request errors"""
    def __init__(self, detail: str = "Bad request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class ConflictException(HTTPException):
    """Exception for conflict errors (e.g., duplicate entries)"""
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class ValidationException(HTTPException):
    """Exception for validation errors"""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )
