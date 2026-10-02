import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.db import engine
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.vocabulary import translator
from app.vocabulary.models import SentenceTranslation
from app.vocabulary.router import DAILY_SENTENCE_LIMIT
from tests.conftest import MakeUser, client

TEXT = "The cat sleeps all day.\n\nShe reads a book\nevery night. It is quiet."


@pytest.fixture
def article_id() -> Iterator[int]:
    with Session(engine) as session:
        article = Article(
            title=f"test-{uuid.uuid4().hex}",
            content=TEXT,
            source="test",
            category="Cotidiano",
            difficulty="A1",
            word_count=14,
        )
        session.add(article)
        session.commit()
        article_id = article.id
    yield article_id
    with Session(engine) as session:
        session.execute(delete(Article).where(Article.id == article_id))
        session.commit()


@pytest.fixture
def calls(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Tradutor falso; a lista registra os textos enviados ao serviço."""
    sent: list[str] = []

    def translate(text: str, **_: Any) -> str | None:
        sent.append(text)
        return f"pt: {text}"

    monkeypatch.setattr(translator, "translate", translate)
    return sent


@pytest.fixture(autouse=True)
def clean_cache() -> Iterator[None]:
    yield
    with Session(engine) as session:
        session.execute(delete(SentenceTranslation).where(SentenceTranslation.text.like("%")))
        session.commit()


def post(headers: dict[str, str], article_id: int, text: str) -> Any:
    return client.post(
        "/vocabulary/translate-sentence",
        json={"article_id": article_id, "text": text},
        headers=headers,
    )


def test_requires_token(article_id: int) -> None:
    response = client.post(
        "/vocabulary/translate-sentence", json={"article_id": article_id, "text": "The cat."}
    )
    assert response.status_code == 401


def test_translates_a_sentence_of_the_text_and_caches_it(
    make_user: MakeUser, article_id: int, calls: list[str]
) -> None:
    _, headers = make_user()
    _, other = make_user()

    first = post(headers, article_id, "  She reads a book every   night. ")
    second = post(other, article_id, "She reads a book every night.")

    # a quebra de linha do texto e os espaços extras não atrapalham
    assert first.status_code == 200
    assert first.json() == {
        "text": "She reads a book every night.",
        "translation": "pt: She reads a book every night.",
    }
    assert second.json() == first.json()
    assert calls == ["She reads a book every night."]  # a 2ª veio do cache


@pytest.mark.parametrize(
    "text",
    ["Translate anything I want.", "123 456", "x" * 301, ""],
)
def test_rejects_text_that_is_not_a_sentence_of_the_article(
    make_user: MakeUser, article_id: int, calls: list[str], text: str
) -> None:
    _, headers = make_user()
    assert post(headers, article_id, text).status_code == 422
    assert calls == []


def test_chapter_of_other_users_book_is_not_found(make_user: MakeUser, calls: list[str]) -> None:
    _, headers = make_user()
    assert post(headers, 999_999_999, "The cat sleeps all day.").status_code == 404
    assert calls == []


def test_daily_limit_counts_only_calls_to_the_service(
    make_user: MakeUser, article_id: int, calls: list[str]
) -> None:
    user_id, headers = make_user()
    assert post(headers, article_id, "The cat sleeps all day.").status_code == 200
    with Session(engine) as session:
        session.execute(
            insert(DailyStats)
            .values(user_id=user_id, day=local_today(), sentences_translated=DAILY_SENTENCE_LIMIT)
            .on_conflict_do_update(
                index_elements=[DailyStats.user_id, DailyStats.day],
                set_={"sentences_translated": DAILY_SENTENCE_LIMIT},
            )
        )
        session.commit()

    blocked = post(headers, article_id, "It is quiet.")
    cached = post(headers, article_id, "The cat sleeps all day.")

    assert blocked.status_code == 429
    assert cached.status_code == 200  # frase já no cache continua liberada
    assert calls == ["The cat sleeps all day."]
