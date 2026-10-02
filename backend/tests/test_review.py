import uuid
from datetime import date, timedelta
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.vocabulary import translator
from app.vocabulary.models import SavedWord
from app.vocabulary.review import (
    DAILY_REVIEW_LIMIT,
    DAILY_REVIEW_XP_CAP,
    MASTERED_BOX,
    next_state,
    review_xp,
)
from tests.conftest import MakeUser, client

TODAY = date(2026, 10, 1)

# --- regras (puras) ---


def test_known_climbs_boxes_with_growing_intervals_until_mastered() -> None:
    box, due = 0, None
    waits = []
    for _ in range(MASTERED_BOX - 1):
        box, due = next_state(box, True, TODAY)
        assert due is not None
        waits.append((due - TODAY).days)
    assert waits == [3, 7, 14, 30, 90]
    assert next_state(box, True, TODAY) == (MASTERED_BOX, None)


def test_still_learning_goes_back_to_box_zero_tomorrow() -> None:
    assert next_state(4, False, TODAY) == (0, TODAY + timedelta(days=1))


def test_review_xp_only_for_known_and_capped_per_day() -> None:
    assert review_xp(False, 0) == 0
    assert review_xp(True, 0) == 2
    assert review_xp(True, DAILY_REVIEW_XP_CAP - 1) == 1
    assert review_xp(True, DAILY_REVIEW_XP_CAP) == 0


# --- API ---


def add_word(user_id: int, *, box: int = 0, due_days: int | None = 0, **extra: Any) -> int:
    """Palavra salva direto no banco, vencendo em `due_days` dias (None = dominada)."""
    due = None if due_days is None else local_today() + timedelta(days=due_days)
    with Session(engine) as session:
        word = SavedWord(
            user_id=user_id,
            word=f"w{uuid.uuid4().hex[:12]}",
            box=box,
            due_on=due,
            **extra,
        )
        session.add(word)
        session.commit()
        return word.id


def queue(headers: dict[str, str]) -> Any:
    response = client.get("/vocabulary/review", headers=headers)
    assert response.status_code == 200
    return response.json()


def answer(headers: dict[str, str], word_id: int, known: bool) -> Any:
    return client.post(f"/vocabulary/{word_id}/review", json={"known": known}, headers=headers)


def today_stats(user_id: int) -> DailyStats | None:
    with Session(engine) as session:
        return session.scalar(
            select(DailyStats).where(DailyStats.user_id == user_id, DailyStats.day == local_today())
        )


def test_review_requires_token() -> None:
    assert client.get("/vocabulary/review").status_code == 401
    assert client.post("/vocabulary/1/review", json={"known": True}).status_code == 401


def test_saved_word_enters_queue_tomorrow(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(translator, "translate", lambda word: "casa")
    user_id, headers = make_user()
    assert client.post("/vocabulary", json={"word": "house"}, headers=headers).status_code == 201

    with Session(engine) as session:
        due = session.scalar(select(SavedWord.due_on).where(SavedWord.user_id == user_id))
    assert due == local_today() + timedelta(days=1)
    assert queue(headers)["cards"] == []


def test_queue_lists_only_own_due_words_oldest_first(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    other_id, _ = make_user()
    older = add_word(user_id, due_days=-3, context="An old one.")
    newer = add_word(user_id, due_days=0)
    add_word(user_id, due_days=2)  # ainda não venceu
    add_word(user_id, due_days=None, box=MASTERED_BOX)  # dominada
    add_word(other_id, due_days=-5)  # de outra pessoa

    body = queue(headers)

    assert [card["id"] for card in body["cards"]] == [older, newer]
    assert body["cards"][0]["context"] == "An old one."
    assert body["due_total"] == 2
    assert body["reviewed_today"] == 0
    assert body["daily_limit"] == DAILY_REVIEW_LIMIT


def test_known_moves_word_up_and_gives_xp(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    word_id = add_word(user_id)

    response = answer(headers, word_id, True)

    assert response.status_code == 200
    assert response.json() == {
        "box": 1,
        "due_on": (local_today() + timedelta(days=3)).isoformat(),
        "mastered": False,
        "xp_gained": 2,
        "reviewed_today": 1,
    }
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_reviewed, stats.review_xp, stats.xp) == (1, 2, 2)
    # revisão não conta como leitura: meta e ofensiva só andam com palavras lidas
    assert stats.words_read == 0
    assert client.get("/stats/summary", headers=headers).json()["xp_total"] == 2


def test_still_learning_resets_box_without_xp(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    word_id = add_word(user_id, box=3)

    body = answer(headers, word_id, False).json()

    assert (body["box"], body["xp_gained"]) == (0, 0)
    assert body["due_on"] == (local_today() + timedelta(days=1)).isoformat()


def test_last_box_known_masters_the_word(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    word_id = add_word(user_id, box=MASTERED_BOX - 1)

    body = answer(headers, word_id, True).json()

    assert body["mastered"] is True
    assert body["due_on"] is None
    assert queue(headers)["due_total"] == 0


def test_word_can_be_answered_once_per_due_date(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    word_id = add_word(user_id)
    not_due = add_word(user_id, due_days=1)

    assert answer(headers, word_id, True).status_code == 200
    # já respondida hoje (agora vence em 3 dias): repetir não rende XP de novo
    assert answer(headers, word_id, True).status_code == 409
    assert answer(headers, not_due, True).status_code == 409
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_reviewed, stats.review_xp) == (1, 2)


def test_other_users_word_is_not_found(make_user: MakeUser) -> None:
    owner_id, _ = make_user()
    _, intruder = make_user()
    word_id = add_word(owner_id)

    assert answer(intruder, word_id, True).status_code == 404
    with Session(engine) as session:
        assert session.get(SavedWord, word_id).box == 0  # type: ignore[union-attr]


def test_daily_limit_and_xp_cap(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    words = [add_word(user_id) for _ in range(DAILY_REVIEW_LIMIT + 1)]
    assert len(queue(headers)["cards"]) == DAILY_REVIEW_LIMIT

    gained = [answer(headers, word_id, True).json()["xp_gained"] for word_id in words[:-1]]

    assert sum(gained) == DAILY_REVIEW_XP_CAP  # 2 XP até o teto, depois 0
    assert gained[-1] == 0
    assert queue(headers)["cards"] == []
    over = answer(headers, words[-1], True)
    assert over.status_code == 409
    stats = today_stats(user_id)
    assert stats is not None
    assert stats.words_reviewed == DAILY_REVIEW_LIMIT  # a resposta recusada não contou
    with Session(engine) as session:
        assert session.get(SavedWord, words[-1]).box == 0  # type: ignore[union-attr]
