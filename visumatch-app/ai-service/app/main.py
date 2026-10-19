import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.api.routes import router as api_router, stt_service
from app.core.config import settings
from app.core.errors import ServiceException
from app.schemas.api_models import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("ai_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Model Whisper dimuat sekali saat startup
    logger.info("Initializing STT model...")
    stt_service.load_model()
    logger.info("STT model loaded successfully.")
    yield


app = FastAPI(
    title="VisuMatch AI Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan
)


# Exception Handlers to match CONTRACT.md {"error": {"code": "...", "message": "..."}}
@app.exception_handler(ServiceException)
async def service_exception_handler(request: Request, exc: ServiceException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {"msg": "Validation error"}
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{first_error.get('loc', ['field'])[-1]}: {first_error.get('msg')}"
            }
        }
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred"
            }
        }
    )


# Health check endpoint (No Auth Required)
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        whisper_model_loaded=stt_service.is_loaded(),
        mock_mode=settings.MOCK_MODE
    )


# Include authenticated v1 routes
app.include_router(api_router)
