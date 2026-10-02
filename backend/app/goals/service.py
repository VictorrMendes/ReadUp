from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.goals.models import ReadingGoal


class GoalStatus(BaseModel):
    target: int | None
    words_today: int
    remaining: int
    completed: bool


def goal_status(target: int | None, words_today: int, met_today: bool = False) -> GoalStatus:
    """met_today: a meta do dia já foi registrada (XP e ofensiva dados). Subir a meta depois disso
    não "descumpre" o dia: a tela de meta e a ofensiva (/stats) contam a mesma história."""
    if target is None:
        return GoalStatus(target=None, words_today=words_today, remaining=0, completed=False)
    completed = met_today or words_today >= target
    return GoalStatus(
        target=target,
        words_today=words_today,
        remaining=0 if completed else target - words_today,
        completed=completed,
    )


def active_target(session: Session, user_id: int) -> int | None:
    return session.scalar(
        select(ReadingGoal.target).where(ReadingGoal.user_id == user_id, ReadingGoal.active)
    )
