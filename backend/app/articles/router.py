from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, computed_field
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, defer

from app.articles.models import Article
from app.articles.text import estimated_minutes
from app.auth.security import get_current_user
from app.db import get_session
from app.reading.models import ReadingProgress
from app.users.models import User

router = APIRouter(prefix="/articles", tags=["articles"])

CurrentUser = Annotated[User, Depends(get_current_user)]

Level = Literal["A1", "A2", "B1", "B2", "C1"]


class ArticleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    difficulty: str | None
    word_count: int
    source: str
    published_at: datetime | None
    # progresso do usuário logado (0/false se nunca leu)
    progress: int = 0
    completed: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def estimated_minutes(self) -> int:
        return estimated_minutes(self.word_count)


class ArticleDetail(ArticleSummary):
    content: str


def _with_progress(user: User) -> Select[Article, int, datetime | None]:
    """Artigo + progresso do usuário numa query só (LEFT JOIN: progress None se nunca leu)."""
    return select(Article, ReadingProgress.progress, ReadingProgress.completed_at).outerjoin(
        ReadingProgress,
        (ReadingProgress.article_id == Article.id) & (ReadingProgress.user_id == user.id),
    )


@router.get("")
def list_articles(
    user: CurrentUser,
    session: Annotated[Session, Depends(get_session)],
    level: Level | None = None,
    category: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ArticleSummary]:
    stmt = (
        _with_progress(user)
        .options(defer(Article.content))
        .order_by(Article.published_at.desc().nulls_last(), Article.id.desc())
        .limit(limit)
        .offset(offset)
    )
    if level:
        stmt = stmt.where(Article.difficulty == level)
    if category:
        stmt = stmt.where(Article.category == category)
    return [
        ArticleSummary.model_validate(article).model_copy(
            update={"progress": progress or 0, "completed": completed_at is not None}
        )
        for article, progress, completed_at in session.execute(stmt)
    ]


@router.get("/{article_id}")
def get_article(
    article_id: int, user: CurrentUser, session: Annotated[Session, Depends(get_session)]
) -> ArticleDetail:
    row = session.execute(_with_progress(user).where(Article.id == article_id)).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Texto não encontrado")
    article, progress, completed_at = row
    return ArticleDetail.model_validate(article).model_copy(
        update={"progress": progress or 0, "completed": completed_at is not None}
    )
