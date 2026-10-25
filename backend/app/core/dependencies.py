
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select

from app.core.security import JWT_ALGORITHM, JWT_SECRET_KEY
from app.database.session import SessionLocal
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials,
        Depends(bearer_scheme)
    ],
) -> User:
    token = credentials.credentials

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        subject = payload.get("sub")

        if not subject:
            raise credentials_error

        user_id = int(subject)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_error

    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.id == user_id)
        )

        if user is None:
            raise credentials_error

        db.expunge(user)
        return user
