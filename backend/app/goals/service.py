from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.goals.models import ReadingGoal


class GoalStatus(BaseModel):
    target: int | None
    words_today: int
    remaining: int
    completed: bool


def goal_status(target: int | None, words_today: int) -> GoalStatus:
    if target is None:
        return GoalStatus(target=None, words_today=words_today, remaining=0, completed=False)
    return GoalStatus(
        target=target,
        words_today=words_today,
        remaining=max(0, target - words_today),
        completed=words_today >= target,
    )


def active_target(session: Session, user_id: int) -> int | None:
    return session.scalar(
        select(ReadingGoal.target).where(ReadingGoal.user_id == user_id, ReadingGoal.active)
    )
