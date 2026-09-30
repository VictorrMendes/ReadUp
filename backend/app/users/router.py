from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.articles.router import Level
from app.auth.security import get_current_user
from app.db import get_session
from app.goals.service import active_target
from app.users.models import User

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    english_level: str | None
    created_at: datetime
    # meta ativa: null (ou english_level null) indica onboarding pendente
    daily_goal: int | None = None


class UserPatch(BaseModel):
    english_level: Level


def _user_out(session: Session, user: User) -> UserOut:
    return UserOut.model_validate(user).model_copy(
        update={"daily_goal": active_target(session, user.id)}
    )


@router.get("/me")
def me(user: CurrentUser, session: DbSession) -> UserOut:
    return _user_out(session, user)


@router.patch("/me")
def update_me(body: UserPatch, user: CurrentUser, session: DbSession) -> UserOut:
    user.english_level = body.english_level
    session.commit()
    return _user_out(session, user)
