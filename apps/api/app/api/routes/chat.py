from fastapi import APIRouter

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.get("/test")
def test_chat():
    return {
        "message": "Chat route working"
    }