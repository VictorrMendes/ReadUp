from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_session
from app.stats.service import DailyPoint, Summary, daily, summary
from app.users.models import User

router = APIRouter(prefix="/stats", tags=["stats"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]


@router.get("/summary")
def get_summary(user: CurrentUser, session: DbSession) -> Summary:
    return summary(session, user.id)


@router.get("/daily")
def get_daily(
    user: CurrentUser, session: DbSession, days: Annotated[int, Query(ge=1, le=30)] = 7
) -> list[DailyPoint]:
    return daily(session, user.id, days)
