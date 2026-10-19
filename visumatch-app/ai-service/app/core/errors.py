from typing import Optional
from fastapi import HTTPException, status


class ServiceException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: Optional[dict] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={"error": {"code": code, "message": message}},
            headers=headers
        )


class UnauthorizedException(ServiceException):
    def __init__(self, message: str = "Invalid or missing internal token"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message=message
        )


class InvalidLLMKeyException(ServiceException):
    def __init__(self, message: str = "Invalid or expired LLM API key"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_LLM_KEY",
            message=message
        )


class FileNotFoundException(ServiceException):
    def __init__(self, message: str = "Media file not found in storage"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="FILE_NOT_FOUND",
            message=message
        )


class UnsupportedMediaException(ServiceException):
    def __init__(self, message: str = "Unsupported media file or invalid audio stream"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="UNSUPPORTED_MEDIA",
            message=message
        )


class STTFailedException(ServiceException):
    def __init__(self, message: str = "Speech to text processing failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="STT_FAILED",
            message=message
        )


class LLMUnavailableException(ServiceException):
    def __init__(self, message: str = "LLM provider is currently unavailable or timed out"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="LLM_UNAVAILABLE",
            message=message
        )
