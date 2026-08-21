from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.chat import router as chat_router
from app.api.routes.learning import router as learning_router


app = FastAPI(
    title="TechSeeker API",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "TechSeeker API Running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(chat_router)
app.include_router(learning_router)
