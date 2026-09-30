from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.books.models import Book
from app.db import engine
from app.reading.models import ReadingProgress
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.vocabulary.models import SavedWord
from tests.conftest import MakeUser, client


def get(path: str, headers: dict[str, str]) -> Any:
    response = client.get(path, headers=headers)
    assert response.status_code == 200
    return response.json()


def add_book(user_id: int, chapters: list[int | None]) -> None:
    """Livro com um capítulo por item: None = nunca lido; N = progresso N (100 = concluído)."""
    now = datetime.now(UTC)
    with Session(engine) as session:
        book = Book(user_id=user_id, title="B", file_name="x.pdf", page_count=1, word_count=100)
        session.add(book)
        session.flush()
        for position, progress in enumerate(chapters, start=1):
            article = Article(
                title=f"Cap {position}",
                content="x",
                source="pdf",
                category="Livro",
                word_count=100,
                book_id=book.id,
                position=position,
            )
            session.add(article)
            session.flush()
            if progress is not None:
                session.add(
                    ReadingProgress(
                        user_id=user_id,
                        article_id=article.id,
                        progress=progress,
                        words_read=progress,
                        completed_at=now if progress == 100 else None,
                    )
                )
        session.commit()


# --- GET /stats/summary: campos novos ---


def test_summary_minutes_saved_words_and_books(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    other_id, other_headers = make_user()
    today = local_today()
    with Session(engine) as session:
        session.add_all(
            [
                DailyStats(user_id=user_id, day=today, seconds_read=100),
                DailyStats(user_id=user_id, day=today - timedelta(days=1), seconds_read=59),
                SavedWord(user_id=user_id, word="house"),
                SavedWord(user_id=user_id, word="tree"),
                DailyStats(user_id=other_id, day=today, seconds_read=600),
                SavedWord(user_id=other_id, word="car"),
            ]
        )
        session.commit()
    add_book(user_id, [40, None])  # iniciado
    add_book(user_id, [100, 100])  # iniciado e concluído
    add_book(user_id, [None, None])  # nem iniciado
    add_book(user_id, [100, 30])  # iniciado, não concluído
    add_book(other_id, [100])

    mine = get("/stats/summary", headers)
    theirs = get("/stats/summary", other_headers)

    # 159 s → 2 min (para baixo)
    assert (mine["minutes_total"], mine["words_saved_total"]) == (2, 2)
    assert (mine["books_started"], mine["books_completed"]) == (3, 1)
    assert (theirs["minutes_total"], theirs["words_saved_total"]) == (10, 1)
    assert (theirs["books_started"], theirs["books_completed"]) == (1, 1)


# --- GET /stats/daily ---


def test_daily_requires_token_and_valid_days(make_user: MakeUser) -> None:
    _, headers = make_user()

    assert client.get("/stats/daily").status_code == 401
    for days in (0, 31, -1):
        response = client.get("/stats/daily", params={"days": days}, headers=headers)
        assert response.status_code == 422
    assert len(get("/stats/daily?days=30", headers)) == 30
    assert len(get("/stats/daily?days=1", headers)) == 1


def test_daily_fills_empty_days_in_chronological_order_per_user(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id, headers = make_user()
    other_id, other_headers = make_user()
    today = date(2026, 3, 10)
    monkeypatch.setattr("app.stats.service.local_today", lambda: today)
    with Session(engine) as session:
        session.add_all(
            [
                DailyStats(user_id=user_id, day=today, words_read=320, xp=82, goal_met=True),
                DailyStats(user_id=user_id, day=today - timedelta(days=2), words_read=90, xp=9),
                DailyStats(user_id=user_id, day=today - timedelta(days=7), words_read=999),  # fora
                DailyStats(user_id=other_id, day=today - timedelta(days=1), words_read=50, xp=5),
            ]
        )
        session.commit()

    mine = get("/stats/daily?days=7", headers)
    theirs = get("/stats/daily", other_headers)  # padrão: 7 dias

    assert [p["day"] for p in mine] == [str(today - timedelta(days=d)) for d in range(6, -1, -1)]
    assert [(p["words_read"], p["xp"], p["goal_met"]) for p in mine] == [
        (0, 0, False),
        (0, 0, False),
        (0, 0, False),
        (0, 0, False),
        (90, 9, False),
        (0, 0, False),
        (320, 82, True),
    ]
    assert [p["words_read"] for p in theirs] == [0, 0, 0, 0, 0, 50, 0]

    # virada do dia: no dia seguinte, a janela anda um dia
    monkeypatch.setattr("app.stats.service.local_today", lambda: today + timedelta(days=1))
    next_day = get("/stats/daily?days=2", headers)
    assert [(p["day"], p["words_read"]) for p in next_day] == [
        (str(today), 320),
        (str(today + timedelta(days=1)), 0),
    ]
