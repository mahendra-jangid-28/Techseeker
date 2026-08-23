from fastapi import FastAPI

app = FastAPI(
    title="TechSeeker Code Runner",
    version="0.1.0",
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "code-runner",
    }
