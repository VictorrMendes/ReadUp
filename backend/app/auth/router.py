from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, StringConstraints
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.db import get_session
from app.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterIn(LoginIn):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, session: Annotated[Session, Depends(get_session)]) -> TokenOut:
    user = User(
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email já cadastrado") from None
    return TokenOut(access_token=create_access_token(user.id))


@router.post("/login")
def login(body: LoginIn, session: Annotated[Session, Depends(get_session)]) -> TokenOut:
    user = session.scalar(select(User).where(User.email == body.email.lower()))
    if user is None:
        verify_password(DUMMY_HASH, body.password)
    if user is None or not verify_password(user.password_hash, body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")
    return TokenOut(access_token=create_access_token(user.id))
