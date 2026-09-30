from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_session
from app.gamification.achievements import AchievementStatus, evaluate
from app.stats.service import achievement_metrics
from app.users.models import User

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
def list_achievements(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[AchievementStatus]:
    """Conquistas do usuário do token, na ordem do catálogo."""
    return evaluate(achievement_metrics(session, user.id))
