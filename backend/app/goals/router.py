from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_session
from app.goals.models import ReadingGoal
from app.goals.service import GoalStatus, active_target, goal_status
from app.stats.models import DailyStats
from app.stats.service import local_today, settle_goal
from app.users.models import User

router = APIRouter(prefix="/goals", tags=["goals"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]


class GoalIn(BaseModel):
    target: int = Field(ge=50, le=10000)


def _status(session: Session, user_id: int) -> GoalStatus:
    words_today = session.scalar(
        select(DailyStats.words_read).where(
            DailyStats.user_id == user_id, DailyStats.day == local_today()
        )
    )
    return goal_status(active_target(session, user_id), words_today or 0)


@router.get("")
def get_goal(user: CurrentUser, session: DbSession) -> GoalStatus:
    return _status(session, user.id)


@router.put("")
def set_goal(body: GoalIn, user: CurrentUser, session: DbSession) -> GoalStatus:
    # trava o usuário: dois PUTs simultâneos não brigam pelo índice de "uma meta ativa"
    session.execute(select(User.id).where(User.id == user.id).with_for_update())
    current = session.scalar(
        select(ReadingGoal).where(ReadingGoal.user_id == user.id, ReadingGoal.active)
    )
    if current is None or current.target != body.target:
        if current is not None:
            current.active = False  # mantém o histórico
            session.flush()
        session.add(ReadingGoal(user_id=user.id, target=body.target))
        session.flush()
        # meta nova já cumprida pelas palavras de hoje: mesma virada do registro de leitura
        settle_goal(session, user.id)
    session.commit()
    return _status(session, user.id)
