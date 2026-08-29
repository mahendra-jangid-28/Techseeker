import time
import uuid
import logging
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.chat import router as chat_router
from app.api.routes.learning import router as learning_router
from app.api.routes.playground import router as playground_router
from app.api.routes.debug import router as debug_router
from app.api.routes.projects import router as projects_router
from app.api.routes.progress import router as progress_router
from app.api.routes.roadmaps import router as roadmaps_router
from app.api.routes.lessons import router as lessons_router
from app.api.routes.certificates import router as certificates_router
from app.api.routes.admin import router as admin_router

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("techseeker.api")

app = FastAPI(
    title="TechSeeker API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)


@app.middleware("http")
async def security_and_observability_middleware(request: Request, call_next):
    # 1. Request Tracing
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.perf_counter()
    request.state.start_time = start_time

    try:
        response: Response = await call_next(request)
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error(
            f"[ERROR] request_id={request_id} method={request.method} path={request.url.path} duration_ms={duration_ms} error={str(exc)}"
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    duration_ms = int((time.perf_counter() - start_time) * 1000)

    # 2. Security Headers Hardening
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # 3. Observability Logging
    logger.info(
        f"[HTTP] request_id={request_id} method={request.method} path={request.url.path} status={response.status_code} duration_ms={duration_ms}"
    )

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(
        request.state,
        "request_id",
        request.headers.get("X-Request-ID", str(uuid.uuid4())),
    )
    headers = {
        "X-Request-ID": request_id,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    if exc.headers:
        headers.update(exc.headers)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(
        request.state,
        "request_id",
        request.headers.get("X-Request-ID", str(uuid.uuid4())),
    )
    headers = {
        "X-Request-ID": request_id,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }

    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(
        request.state,
        "request_id",
        request.headers.get("X-Request-ID", str(uuid.uuid4())),
    )
    start_time = getattr(request.state, "start_time", None)
    duration_ms = (
        int((time.perf_counter() - start_time) * 1000)
        if start_time is not None
        else 0
    )
    logger.error(
        f"[ERROR] request_id={request_id} method={request.method} path={request.url.path} duration_ms={duration_ms} error={str(exc)}"
    )

    headers = {
        "X-Request-ID": request_id,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


@app.get("/")
def root():
    return {
        "message": "TechSeeker API Running",
        "version": "1.0.0",
        "status": "healthy",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
    }


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(progress_router)
app.include_router(roadmaps_router)
app.include_router(lessons_router)
app.include_router(chat_router)
app.include_router(learning_router)
app.include_router(playground_router)
app.include_router(debug_router)
app.include_router(projects_router)
app.include_router(certificates_router)
app.include_router(admin_router)
