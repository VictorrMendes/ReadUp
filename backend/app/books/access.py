from sqlalchemy import ColumnElement, or_, select

from app.articles.models import Article
from app.books.models import Book


def visible_to(user_id: int) -> ColumnElement[bool]:
    """Regra única de acesso a um article: texto público do feed (sem livro) ou capítulo de um
    livro do próprio usuário. Capítulo de outro usuário se comporta como inexistente (404)."""
    return or_(
        Article.book_id.is_(None),
        Article.book_id.in_(select(Book.id).where(Book.user_id == user_id)),
    )
