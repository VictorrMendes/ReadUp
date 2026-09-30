from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_session
from app.stats.service import Summary, summary
from app.users.models import User

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary")
def get_summary(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Summary:
    return summary(session, user.id)
