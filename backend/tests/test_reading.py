import uuid
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.auth.security import create_access_token
from app.db import engine
from app.main import app
from app.reading.rules import credit, progress_percent
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.users.models import User

client = TestClient(app)

# --- regra pura ---


def test_credit_partial_target() -> None:
    assert credit(300, 0, 50, 120) == 150


def test_credit_never_goes_back() -> None:
    assert credit(300, 200, 30, 120) == 200


def test_credit_is_capped_by_time() -> None:
    assert credit(300, 0, 100, 1) == 10


def test_credit_never_exceeds_word_count() -> None:
    assert credit(300, 295, 100, 120) == 300


@pytest.mark.parametrize(
    ("words_read", "word_count", "expected"),
    [(0, 300, 0), (150, 300, 50), (299, 300, 99), (300, 300, 100), (2, 3, 66), (0, 0, 100)],
)
def test_progress_percent(words_read: int, word_count: int, expected: int) -> None:
    assert progress_percent(words_read, word_count) == expected


# --- endpoint ---


@pytest.fixture
def make_user() -> Iterator[Callable[[], tuple[int, dict[str, str]]]]:
    ids: list[int] = []

    def create() -> tuple[int, dict[str, str]]:
        with Session(engine) as session:
            user = User(name="T", email=f"read-{uuid.uuid4().hex}@example.com", password_hash="x")
            session.add(user)
            session.commit()
            ids.append(user.id)
            return user.id, {"Authorization": f"Bearer {create_access_token(user.id)}"}

    yield create
    with Session(engine) as session:  # cascade apaga reading_progress e daily_stats
        session.execute(delete(User).where(User.id.in_(ids)))
        session.commit()


@pytest.fixture
def article_id() -> Iterator[int]:
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


def post(headers: dict[str, str], **body: Any) -> Any:
    return client.post("/reading/progress", json=body, headers=headers)


def pretend_time_passed(user_id: int, article_id: int, seconds: int) -> None:
    """Recua updated_at como se `seconds` tivessem passado desde o último registro."""
    with Session(engine) as session:
        session.execute(
            text(
                "UPDATE reading_progress SET updated_at = updated_at - make_interval(secs => :s)"
                " WHERE user_id = :u AND article_id = :a"
            ),
            {"s": seconds, "u": user_id, "a": article_id},
        )
        session.commit()


def today_stats(user_id: int) -> DailyStats | None:
    with Session(engine) as session:
        return session.scalar(
            select(DailyStats).where(DailyStats.user_id == user_id, DailyStats.day == local_today())
        )


def test_requires_token() -> None:
    response = client.post(
        "/reading/progress", json={"article_id": 1, "progress": 10, "seconds": 5}
    )
    assert response.status_code == 401


def test_missing_article_is_404(make_user: Callable[[], tuple[int, dict[str, str]]]) -> None:
    _, headers = make_user()

    response = post(headers, article_id=999999999, progress=10, seconds=5)

    assert response.status_code == 404
    assert response.json() == {"detail": "Texto não encontrado"}


@pytest.mark.parametrize(
    "body",
    [
        {"progress": 101, "seconds": 5},
        {"progress": 10, "seconds": -1},
        {"progress": 10, "seconds": 121},
    ],
)
def test_invalid_body_is_422(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int, body: dict[str, int]
) -> None:
    _, headers = make_user()
    assert post(headers, article_id=article_id, **body).status_code == 422


def open_session(user_id: int, headers: dict[str, str], article_id: int) -> None:
    """Primeiro envio só abre a sessão; depois simula 20 s de leitura."""
    post(headers, article_id=article_id, progress=0, seconds=0)
    pretend_time_passed(user_id, article_id, 20)


def test_first_send_only_opens_session(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    user_id, headers = make_user()

    first = post(headers, article_id=article_id, progress=100, seconds=120).json()

    assert first == {"progress": 0, "words_read": 0, "words_credited": 0, "completed": False}
    assert today_stats(user_id) is None


def test_reading_in_steps_credits_and_sums_daily_stats(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    first = post(headers, article_id=article_id, progress=30, seconds=15).json()
    pretend_time_passed(user_id, article_id, 20)
    second = post(headers, article_id=article_id, progress=60, seconds=15).json()

    assert first == {"progress": 30, "words_read": 90, "words_credited": 90, "completed": False}
    assert second == {"progress": 60, "words_read": 180, "words_credited": 90, "completed": False}
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.seconds_read, stats.texts_completed) == (180, 30, 0)


def test_long_gap_restarts_session(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    post(headers, article_id=article_id, progress=30, seconds=15)

    pretend_time_passed(user_id, article_id, 400)  # > SESSION_GAP_SECONDS
    reopened = post(headers, article_id=article_id, progress=100, seconds=120).json()
    pretend_time_passed(user_id, article_id, 20)
    resumed = post(headers, article_id=article_id, progress=100, seconds=15).json()

    assert reopened["words_credited"] == 0
    assert resumed["words_credited"] == 150  # teto: 15 s x 10 palavras/s
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.seconds_read) == (240, 30)


def test_back_to_back_calls_do_not_add_time_that_did_not_pass(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    post(headers, article_id=article_id, progress=10, seconds=15)
    second = post(headers, article_id=article_id, progress=100, seconds=30).json()

    # segunda chamada imediata: ~0 s efetivos -> sem crédito novo por tempo
    assert second["words_credited"] == 0
    stats = today_stats(user_id)
    assert stats is not None
    assert stats.seconds_read <= 16
    assert stats.words_read == 30


def test_completion_counts_once(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    pretend_time_passed(user_id, article_id, 40)

    done = post(headers, article_id=article_id, progress=100, seconds=60).json()
    pretend_time_passed(user_id, article_id, 60)
    again = post(headers, article_id=article_id, progress=100, seconds=60).json()

    assert done == {"progress": 100, "words_read": 300, "words_credited": 300, "completed": True}
    assert again["completed"] is True
    assert again["words_credited"] == 0
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.texts_completed) == (300, 1)


def test_articles_show_progress_of_logged_user_only(
    make_user: Callable[[], tuple[int, dict[str, str]]], article_id: int
) -> None:
    reader_id, reader = make_user()
    _, other = make_user()
    open_session(reader_id, reader, article_id)
    post(reader, article_id=article_id, progress=50, seconds=20)

    mine = client.get(f"/articles/{article_id}", headers=reader).json()
    theirs = client.get(f"/articles/{article_id}", headers=other).json()
    listed = {a["id"]: a for a in client.get("/articles?limit=50", headers=reader).json()}

    assert (mine["progress"], mine["completed"]) == (50, False)
    assert (theirs["progress"], theirs["completed"]) == (0, False)
    assert listed[article_id]["progress"] == 50
