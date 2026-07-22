from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.user import User
from app.repositories.user_repository import (
    authenticate_user,
    create_user,
    get_user_by_email,
)
from app.schemas.user import UserCreate, UserResponse
from app.security.password import hash_password
from app.schemas.user import UserLogin
from app.schemas.token import Token
from app.security.token import create_access_token
from fastapi.security import OAuth2PasswordRequestForm
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    existing = get_user_by_email(db, user.email)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
    )

    return create_user(db, new_user)
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    db_user = authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        {
            "sub": db_user.email,
            "user_id": db_user.id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }