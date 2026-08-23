from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.chat import router as chat_router
from app.api.routes.learning import router as learning_router
from app.api.routes.playground import router as playground_router
from app.api.routes.debug import router as debug_router
from app.api.routes.projects import router as projects_router


app = FastAPI(
    title="TechSeeker API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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
app.include_router(playground_router)
app.include_router(debug_router)
app.include_router(projects_router)
