from datetime import date, timedelta
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine
from app.gamification.xp import (
    DAILY_GOAL_XP,
    MIN_WORDS_FOR_COMPLETION_XP,
    TEXT_COMPLETED_XP,
    completion_xp,
    xp_for_words,
)
from app.stats.models import DailyStats
from app.stats.service import local_today
from tests.conftest import (
    MakeArticle,
    MakeUser,
    client,
    open_session,
    post,
    pretend_time_passed,
    today_stats,
)

ZEROS = {
    "xp_total": 0,
    "xp_today": 0,
    "words_today": 0,
    "words_total": 0,
    "texts_completed_total": 0,
    "streak_current": 0,
    "streak_longest": 0,
    "streak_active_today": False,
    "streak_freezes": 0,
    "minutes_total": 0,
    "words_saved_total": 0,
    "books_started": 0,
    "books_completed": 0,
}

# --- regra pura ---


@pytest.mark.parametrize(
    ("before", "after", "expected"),
    [(0, 9, 0), (0, 10, 1), (5, 25, 2), (19, 20, 1), (37, 37, 0)],
)
def test_xp_for_words(before: int, after: int, expected: int) -> None:
    assert xp_for_words(before, after) == expected


# --- POST /reading/progress ---


def read(user_id: int, headers: dict[str, str], article_id: int, progress: int) -> Any:
    """Um envio de 15 s dentro da sessão (teto de 150 palavras), após 20 s simulados."""
    pretend_time_passed(user_id, article_id, 20)
    return post(headers, article_id=article_id, progress=progress, seconds=15).json()


def set_goal(headers: dict[str, str], target: int) -> None:
    assert client.put("/goals", json={"target": target}, headers=headers).status_code == 200


def test_reading_in_steps_keeps_the_remainder_between_sends(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    # 15, 27 e 51 palavras no dia: 1 + 1 + 3 XP (cada envio sozinho daria 1 + 1 + 2)
    gains = [read(user_id, headers, article_id, p)["xp_gained"] for p in (5, 9, 17)]

    assert gains == [1, 1, 3]
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.xp) == (51, 51 // 10)
    assert sum(gains) == stats.xp


def test_completing_a_text_gives_bonus_only_once(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    read(user_id, headers, article_id, 50)  # 150 palavras -> 15 XP

    done = read(user_id, headers, article_id, 100)
    again = read(user_id, headers, article_id, 100)

    assert done["completed"] is True
    assert done["xp_gained"] == 15 + TEXT_COMPLETED_XP
    assert again["xp_gained"] == 0
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.xp, stats.texts_completed) == (30 + TEXT_COMPLETED_XP, 1)


def test_goal_bonus_once_a_day_even_if_goal_changes(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    set_goal(headers, 50)
    open_session(user_id, headers, article_id)

    below = read(user_id, headers, article_id, 10)  # 30 palavras
    crossed = read(user_id, headers, article_id, 30)  # 90 palavras: cruza a meta de 50
    after = read(user_id, headers, article_id, 50)  # 150 palavras
    set_goal(headers, 200)
    new_goal = read(user_id, headers, article_id, 90)  # 270 palavras: cruza a nova meta

    assert (below["xp_gained"], below["goal_met"]) == (3, False)
    assert (crossed["xp_gained"], crossed["goal_met"]) == (6 + DAILY_GOAL_XP, True)
    assert (after["xp_gained"], after["goal_met"]) == (6, True)
    assert (new_goal["xp_gained"], new_goal["goal_met"]) == (12, True)
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.xp, stats.goal_met) == (27 + DAILY_GOAL_XP, True)


def test_without_active_goal_there_is_no_goal_bonus(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    result = read(user_id, headers, article_id, 50)

    assert (result["xp_gained"], result["goal_met"]) == (15, False)
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.xp, stats.goal_met) == (15, False)


def test_new_day_uses_a_new_row_and_goal_bonus_can_be_earned_again(
    make_user: MakeUser, article_id: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id, headers = make_user()
    set_goal(headers, 50)
    open_session(user_id, headers, article_id)
    monday, tuesday = date(2026, 3, 2), date(2026, 3, 3)

    monkeypatch.setattr("app.stats.service.local_today", lambda: monday)
    first = read(user_id, headers, article_id, 30)  # 90 palavras na segunda
    monkeypatch.setattr("app.stats.service.local_today", lambda: tuesday)
    second = read(user_id, headers, article_id, 60)  # +90 palavras na terça

    assert (first["xp_gained"], first["goal_met"]) == (9 + DAILY_GOAL_XP, True)
    assert (second["xp_gained"], second["goal_met"]) == (9 + DAILY_GOAL_XP, True)
    with Session(engine) as session:
        rows = session.execute(
            select(DailyStats.day, DailyStats.words_read, DailyStats.xp, DailyStats.goal_met)
            .where(DailyStats.user_id == user_id)
            .order_by(DailyStats.day)
        ).all()
    assert [tuple(row) for row in rows] == [
        (monday, 90, 9 + DAILY_GOAL_XP, True),
        (tuesday, 90, 9 + DAILY_GOAL_XP, True),
    ]


def test_opening_send_and_send_after_long_gap_give_no_xp(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    set_goal(headers, 50)

    opening = post(headers, article_id=article_id, progress=100, seconds=120).json()
    pretend_time_passed(user_id, article_id, 400)  # > SESSION_GAP_SECONDS
    reopened = post(headers, article_id=article_id, progress=100, seconds=120).json()

    assert (opening["xp_gained"], opening["goal_met"]) == (0, False)
    assert (reopened["xp_gained"], reopened["goal_met"]) == (0, False)
    assert today_stats(user_id) is None


# --- GET /stats/summary ---


def test_summary_requires_token() -> None:
    assert client.get("/stats/summary").status_code == 401


def test_summary_is_zero_for_new_user(make_user: MakeUser) -> None:
    _, headers = make_user()

    response = client.get("/stats/summary", headers=headers)

    assert response.status_code == 200
    assert response.json() == ZEROS


def test_summary_sums_days_and_is_isolated_per_user(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    other_id, other_headers = make_user()
    _, newcomer_headers = make_user()
    today = local_today()
    with Session(engine) as session:
        session.add_all(
            [
                DailyStats(
                    user_id=user_id,
                    day=today - timedelta(days=1),
                    words_read=200,
                    xp=90,
                    texts_completed=1,
                ),
                DailyStats(user_id=user_id, day=today, words_read=120, xp=12, texts_completed=2),
                DailyStats(user_id=other_id, day=today, words_read=70, xp=7),
            ]
        )
        session.commit()

    mine = client.get("/stats/summary", headers=headers).json()
    theirs = client.get("/stats/summary", headers=other_headers).json()
    nothing = client.get("/stats/summary", headers=newcomer_headers).json()

    assert mine == {
        **ZEROS,
        "xp_total": 102,
        "xp_today": 12,
        "words_today": 120,
        "words_total": 320,
        "texts_completed_total": 3,
    }
    assert theirs == {**ZEROS, "xp_total": 7, "xp_today": 7, "words_today": 70, "words_total": 70}
    assert nothing == ZEROS


@pytest.mark.parametrize(("words", "bonus"), [(50, 0), (99, 0), (100, TEXT_COMPLETED_XP)])
def test_completion_xp_needs_a_minimum_size(words: int, bonus: int) -> None:
    assert MIN_WORDS_FOR_COMPLETION_XP == 100
    assert completion_xp(words) == bonus


def test_completing_a_tiny_text_counts_but_gives_no_bonus(
    make_user: MakeUser, make_article: MakeArticle
) -> None:
    user_id, headers = make_user()
    tiny = make_article(50)
    open_session(user_id, headers, tiny)

    done = read(user_id, headers, tiny, 100)

    assert (done["completed"], done["words_credited"], done["xp_gained"]) == (True, 50, 5)
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.xp, stats.texts_completed) == (5, 1)
