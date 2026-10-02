from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, computed_field
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, defer

from app.articles.models import Article
from app.articles.text import estimated_minutes
from app.auth.security import get_current_user
from app.books.access import visible_to
from app.books.models import Book
from app.db import get_session
from app.news.attribution import attribution
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
    book_id: int | None  # capítulo de livro do usuário; null = texto do feed
    book_title: str | None = None  # nome do livro do capítulo (o capítulo sozinho não diz qual é)
    # progresso do usuário logado (0/false se nunca leu)
    progress: int = 0
    completed: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def estimated_minutes(self) -> int:
        return estimated_minutes(self.word_count)


class ArticleDetail(ArticleSummary):
    content: str
    source_url: str | None  # link original (notícias); null para textos do app e PDFs
    next_article_id: int | None = None  # próximo capítulo do mesmo livro

    @computed_field  # type: ignore[prop-decorator]
    @property
    def attribution(self) -> str | None:
        """Crédito da fonte (notícias); null para textos do app e PDFs."""
        return attribution(self.source, self.published_at)


def _with_progress(user: User) -> Select[Article, int, datetime | None, str | None]:
    """Artigo + progresso do usuário + nome do livro (capítulos) numa query só.
    LEFT JOINs: progress None se nunca leu; book_title None para textos do feed."""
    return (
        select(Article, ReadingProgress.progress, ReadingProgress.completed_at, Book.title)
        .outerjoin(
            ReadingProgress,
            (ReadingProgress.article_id == Article.id) & (ReadingProgress.user_id == user.id),
        )
        .outerjoin(Book, Book.id == Article.book_id)
    )


@router.get("")
def list_articles(
    user: CurrentUser,
    session: Annotated[Session, Depends(get_session)],
    level: Level | None = None,
    category: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    in_progress: bool = False,
) -> list[ArticleSummary]:
    stmt = _with_progress(user).options(defer(Article.content)).limit(limit).offset(offset)
    if in_progress:
        # "continuar lendo": começados e não terminados, o mais recente primeiro
        # inclui capítulos dos livros do próprio usuário
        stmt = stmt.where(
            ReadingProgress.progress > 0, ReadingProgress.progress < 100, visible_to(user.id)
        ).order_by(ReadingProgress.updated_at.desc())
    else:
        # feed/Explorar: só textos públicos
        stmt = stmt.where(Article.book_id.is_(None)).order_by(
            Article.published_at.desc().nulls_last(), Article.id.desc()
        )
    if level:
        stmt = stmt.where(Article.difficulty == level)
    if category:
        stmt = stmt.where(Article.category == category)
    return [
        ArticleSummary.model_validate(article).model_copy(
            update={
                "progress": progress or 0,
                "completed": completed_at is not None,
                "book_title": book_title,
            }
        )
        for article, progress, completed_at, book_title in session.execute(stmt)
    ]


@router.get("/{article_id}")
def get_article(
    article_id: int, user: CurrentUser, session: Annotated[Session, Depends(get_session)]
) -> ArticleDetail:
    row = session.execute(
        _with_progress(user).where(Article.id == article_id, visible_to(user.id))
    ).first()
    if row is None:  # inexistente ou capítulo de outro usuário: mesma resposta
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Texto não encontrado")
    article, progress, completed_at, book_title = row
    next_article_id = None
    if article.book_id is not None:
        next_article_id = session.scalar(
            select(Article.id)
            .where(Article.book_id == article.book_id, Article.position > article.position)
            .order_by(Article.position)
            .limit(1)
        )
    return ArticleDetail.model_validate(article).model_copy(
        update={
            "progress": progress or 0,
            "completed": completed_at is not None,
            "next_article_id": next_article_id,
            "book_title": book_title,
        }
    )
