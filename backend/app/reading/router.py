from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.auth.security import get_current_user
from app.db import get_session
from app.reading.models import ReadingProgress
from app.reading.rules import credit, progress_percent
from app.stats.service import add_daily_activity
from app.users.models import User

router = APIRouter(prefix="/reading", tags=["reading"])

SESSION_GAP_SECONDS = 300


class ProgressIn(BaseModel):
    article_id: int
    progress: int = Field(ge=0, le=100)
    seconds: int = Field(ge=0, le=120)


class ProgressOut(BaseModel):
    progress: int
    words_read: int
    words_credited: int
    completed: bool


@router.post("/progress")
def save_progress(
    body: ProgressIn,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ProgressOut:
    word_count = session.scalar(select(Article.word_count).where(Article.id == body.article_id))
    if word_count is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Texto não encontrado")

    # cria a linha sem corrida entre requisições simultâneas; RETURNING diz se é nova
    created = (
        session.scalar(
            insert(ReadingProgress)
            .values(user_id=user.id, article_id=body.article_id)
            .on_conflict_do_nothing(index_elements=["user_id", "article_id"])
            .returning(ReadingProgress.id)
        )
        is not None
    )
    row = session.scalars(
        select(ReadingProgress)
        .where(ReadingProgress.user_id == user.id, ReadingProgress.article_id == body.article_id)
        .with_for_update()
    ).one()
    # relógio do banco, o mesmo que gravou updated_at
    now = session.execute(select(func.now())).scalar_one()

    # Linha nova ou retorno após pausa longa só ABRE a sessão (0 s, 0 palavras): o servidor não
    # tem como conferir o tempo informado. Dentro da sessão, não soma mais do que passou.
    elapsed = int((now - row.updated_at).total_seconds())
    if created or elapsed > SESSION_GAP_SECONDS:
        seconds = 0
    else:
        seconds = min(body.seconds, max(0, elapsed))

    before = row.words_read
    after = credit(word_count, before, body.progress, seconds)
    completed_now = after == word_count and row.completed_at is None

    row.words_read = after
    row.progress = progress_percent(after, word_count)
    row.seconds_read += seconds
    row.updated_at = now
    if completed_now:
        row.completed_at = now

    add_daily_activity(session, user.id, after - before, seconds, int(completed_now))
    session.commit()
    return ProgressOut(
        progress=row.progress,
        words_read=after,
        words_credited=after - before,
        completed=row.completed_at is not None,
    )
