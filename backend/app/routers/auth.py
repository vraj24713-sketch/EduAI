
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Annotated
from fastapi import Depends
from app.core.dependencies import get_current_user

from app.database.session import SessionLocal
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(user: UserCreate):
    with SessionLocal() as db:
        existing = db.scalar(
            select(User).where(
                (User.email == user.email)
                | (User.username == user.username)
            )
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email or username is already registered",
            )

        new_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hash_password(user.password),
        )

        db.add(new_user)

        try:
            db.commit()
            db.refresh(new_user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email or username is already registered",
            )

        return new_user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == credentials.email)
        )

        if not user or not verify_password(
            credentials.password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(str(user.id))

        return TokenResponse(access_token=token)
@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user
