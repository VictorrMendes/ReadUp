import os
import uuid
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.auth.security import create_access_token
from app.db import engine
from app.main import app
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.users.models import User

# testes nunca buscam notícias de verdade (lido no lifespan, se algum teste o iniciar)
os.environ["NEWS_FETCH_HOURS"] = "0"

client = TestClient(app)

MakeUser = Callable[[], tuple[int, dict[str, str]]]

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


@pytest.fixture(scope="session", autouse=True)
def upgrade_head() -> None:
    """Migra o banco uma vez antes de qualquer teste: a suíte não depende da ordem dos arquivos."""
    command.upgrade(Config(str(ALEMBIC_INI)), "head")


@pytest.fixture
def make_user() -> Iterator[MakeUser]:
    ids: list[int] = []

    def create() -> tuple[int, dict[str, str]]:
        with Session(engine) as session:
            user = User(name="T", email=f"test-{uuid.uuid4().hex}@example.com", password_hash="x")
            session.add(user)
            session.commit()
            ids.append(user.id)
            return user.id, {"Authorization": f"Bearer {create_access_token(user.id)}"}

    yield create
    with Session(engine) as session:  # cascade apaga metas, reading_progress e daily_stats
        session.execute(delete(User).where(User.id.in_(ids)))
        session.commit()


@pytest.fixture
def article_id() -> Iterator[int]:
    """Texto de 300 palavras."""
    with Session(engine) as session:
        article = Article(
            title=f"test-{uuid.uuid4().hex}",
            content="word " * 300,
            source="test",
            category="Cotidiano",
            difficulty="A1",
            word_count=300,
        )
        session.add(article)
        session.commit()
        article_id = article.id
    yield article_id
    with Session(engine) as session:
        session.execute(delete(Article).where(Article.id == article_id))
        session.commit()


MakeArticle = Callable[[int], int]


@pytest.fixture
def make_article() -> Iterator[MakeArticle]:
    """Cria textos do feed com `word_count` palavras; apaga ao fim."""
    ids: list[int] = []

    def create(word_count: int) -> int:
        with Session(engine) as session:
            article = Article(
                title=f"test-{uuid.uuid4().hex}",
                content="word " * word_count,
                source="test",
                category="Cotidiano",
                difficulty="A1",
                word_count=word_count,
            )
            session.add(article)
            session.commit()
            ids.append(article.id)
            return article.id

    yield create
    with Session(engine) as session:
        session.execute(delete(Article).where(Article.id.in_(ids)))
        session.commit()


def post(headers: dict[str, str], **body: Any) -> Any:
    return client.post("/reading/progress", json=body, headers=headers)


def pretend_time_passed(user_id: int, article_id: int | None, seconds: int) -> None:
    """Recua os relógios como se `seconds` tivessem passado desde o último registro: o do texto
    (reading_progress.updated_at; todos os textos do usuário se article_id for None) e o do
    usuário (users.last_reading_at, o orçamento de tempo por usuário)."""
    params = {"s": seconds, "u": user_id, "a": article_id}
    with Session(engine) as session:
        session.execute(
            text(
                "UPDATE reading_progress SET updated_at = updated_at - make_interval(secs => :s)"
                " WHERE user_id = :u AND (CAST(:a AS BIGINT) IS NULL OR article_id = :a)"
            ),
            params,
        )
        session.execute(
            text(
                "UPDATE users SET last_reading_at = last_reading_at - make_interval(secs => :s)"
                " WHERE id = :u"
            ),
            params,
        )
        session.commit()


def open_session(user_id: int, headers: dict[str, str], article_id: int) -> None:
    """Primeiro envio só abre a sessão; depois simula 20 s de leitura."""
    post(headers, article_id=article_id, progress=0, seconds=0)
    pretend_time_passed(user_id, article_id, 20)


def today_stats(user_id: int) -> DailyStats | None:
    with Session(engine) as session:
        return session.scalar(
            select(DailyStats).where(DailyStats.user_id == user_id, DailyStats.day == local_today())
        )
