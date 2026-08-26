import time
import uuid
import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

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

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("techseeker.api")

app = FastAPI(
    title="TechSeeker API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)


@app.middleware("http")
async def security_and_observability_middleware(request: Request, call_next):
    # 1. Request Tracing
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.perf_counter()

    try:
        response: Response = await call_next(request)
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error(
            f"[ERROR] request_id={request_id} method={request.method} path={request.url.path} duration_ms={duration_ms} error={str(exc)}"
        )
        raise exc

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


@app.get("/")
def root():
    return {
        "message": "TechSeeker API Running",
        "version": "0.1.0",
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
