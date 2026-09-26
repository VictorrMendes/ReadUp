import json
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.articles.seed import SEED_FILE, SOURCE, seed
from app.articles.text import count_words, estimated_minutes
from app.auth.security import create_access_token
from app.db import engine
from app.main import app
from app.users.models import User

client = TestClient(app)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I don't know, it's fine.", 5),
        ("She has 3 cats and 1,000 books; it costs 3.5 dollars.", 11),
        ("Hello -- world ... !!! ?", 2),
        ("A well-known fact.", 3),
        ("", 0),
        ("   \n\n  ", 0),
    ],
)
def test_count_words(text: str, expected: int) -> None:
    assert count_words(text) == expected


@pytest.mark.parametrize(("words", "minutes"), [(0, 1), (200, 1), (201, 2), (450, 3)])
def test_estimated_minutes(words: int, minutes: int) -> None:
    assert estimated_minutes(words) == minutes


@pytest.fixture
def auth() -> Iterator[dict[str, str]]:
    with Session(engine) as session:
        user = User(name="T", email=f"art-{uuid.uuid4().hex}@example.com", password_hash="x")
        session.add(user)
        session.commit()
        user_id = user.id
    yield {"Authorization": f"Bearer {create_access_token(user_id)}"}
    with Session(engine) as session:
        session.execute(delete(User).where(User.id == user_id))
        session.commit()


@pytest.fixture
def article() -> Iterator[Article]:
    with Session(engine, expire_on_commit=False) as session:
        a = Article(
            title=f"test-{uuid.uuid4().hex}",
            content="One two three.",
            source="test",
            category="Cotidiano",
            difficulty="A1",
            word_count=3,
            published_at=datetime.now(UTC),  # mais recente: aparece no topo
        )
        session.add(a)
        session.commit()
    yield a
    with Session(engine) as session:
        session.execute(delete(Article).where(Article.id == a.id))
        session.commit()


def test_list_requires_token() -> None:
    assert client.get("/articles").status_code == 401


def test_list_filters_by_level_without_content(auth: dict[str, str], article: Article) -> None:
    a1 = client.get("/articles", params={"level": "A1"}, headers=auth)
    b2 = client.get("/articles", params={"level": "B2"}, headers=auth)

    assert a1.status_code == 200
    items = a1.json()
    assert items[0]["id"] == article.id
    assert items[0]["estimated_minutes"] == 1
    assert all("content" not in item for item in items)
    assert all(item["difficulty"] == "A1" for item in items)
    assert article.id not in {item["id"] for item in b2.json()}


@pytest.mark.parametrize("params", [{"limit": 51}, {"limit": 0}, {"offset": -1}, {"level": "Z9"}])
def test_list_rejects_invalid_params(auth: dict[str, str], params: dict[str, int | str]) -> None:
    assert client.get("/articles", params=params, headers=auth).status_code == 422


def test_get_article(auth: dict[str, str], article: Article) -> None:
    response = client.get(f"/articles/{article.id}", headers=auth)

    assert response.status_code == 200
    assert response.json()["content"] == "One two three."


def test_get_missing_article_is_404(auth: dict[str, str]) -> None:
    response = client.get("/articles/999999999", headers=auth)

    assert response.status_code == 404
    assert response.json() == {"detail": "Texto não encontrado"}


def test_seed_is_idempotent() -> None:
    # os textos de seed são dados desejados: ficam no banco
    with Session(engine) as session:
        seed(session)
        assert seed(session) == 0
        total = session.scalar(
            select(func.count()).select_from(Article).where(Article.source == SOURCE)
        )
    assert total == len(json.loads(SEED_FILE.read_text(encoding="utf-8")))
