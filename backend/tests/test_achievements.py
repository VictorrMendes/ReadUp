from typing import Any

import pytest
from sqlalchemy.orm import Session

from app.db import engine
from app.gamification.achievements import CATALOG, Metrics, evaluate, newly_unlocked
from app.gamification.models import Streak
from app.stats.models import DailyStats
from app.stats.service import local_today
from tests.conftest import (
    MakeArticle,
    MakeUser,
    client,
    open_session,
    post,
    pretend_time_passed,
)

ZERO = Metrics(words_total=0, texts_completed=0, goal_days=0, longest_streak=0)


def unlocked_ids(metrics: Metrics) -> set[str]:
    return {a.id for a in evaluate(metrics) if a.unlocked}


# --- evaluate (puro) ---


def test_catalog_has_ten_stable_ids_in_order() -> None:
    assert [a.id for a in CATALOG] == [
        "first-text",
        "texts-10",
        "texts-50",
        "words-1k",
        "words-10k",
        "words-50k",
        "goal-1",
        "goal-7",
        "streak-3",
        "streak-7",
    ]


def test_nothing_unlocked_at_zero() -> None:
    statuses = evaluate(ZERO)

    assert len(statuses) == 10
    assert all(not s.unlocked and s.current == 0 for s in statuses)


@pytest.mark.parametrize(
    ("metrics", "just_below", "reached"),
    [
        (ZERO._replace(texts_completed=1), set(), {"first-text"}),
        (ZERO._replace(texts_completed=10), {"first-text"}, {"first-text", "texts-10"}),
        (ZERO._replace(words_total=999), set(), set()),
        (ZERO._replace(words_total=1000), set(), {"words-1k"}),
        (ZERO._replace(words_total=10000), set(), {"words-1k", "words-10k"}),
        (ZERO._replace(goal_days=1), set(), {"goal-1"}),
        (ZERO._replace(goal_days=7), set(), {"goal-1", "goal-7"}),
        (ZERO._replace(longest_streak=2), set(), set()),
        (ZERO._replace(longest_streak=3), set(), {"streak-3"}),
        (ZERO._replace(longest_streak=7), set(), {"streak-3", "streak-7"}),
    ],
)
def test_exact_thresholds(metrics: Metrics, just_below: set[str], reached: set[str]) -> None:
    assert unlocked_ids(metrics) == reached
    assert just_below <= reached


def test_current_is_capped_at_the_target() -> None:
    statuses = {s.id: s for s in evaluate(ZERO._replace(words_total=3200, texts_completed=70))}

    assert (statuses["words-1k"].current, statuses["words-1k"].unlocked) == (1000, True)
    assert (statuses["words-10k"].current, statuses["words-10k"].unlocked) == (3200, False)
    assert (statuses["texts-50"].current, statuses["texts-50"].target) == (50, 50)


def test_newly_unlocked_compares_before_and_after() -> None:
    before = ZERO._replace(words_total=990)
    after = before._replace(words_total=1010, texts_completed=1)

    assert [a.id for a in newly_unlocked(before, after)] == ["first-text", "words-1k"]
    assert newly_unlocked(after, after) == []


# --- GET /achievements ---


def achievements(headers: dict[str, str]) -> Any:
    response = client.get("/achievements", headers=headers)
    assert response.status_code == 200
    return response.json()


def test_requires_token() -> None:
    assert client.get("/achievements").status_code == 401


def test_new_user_has_everything_locked_and_users_are_isolated(make_user: MakeUser) -> None:
    user_id, headers = make_user()
    _, other = make_user()
    with Session(engine) as session:
        session.add_all(
            [
                DailyStats(
                    user_id=user_id,
                    day=local_today(),
                    words_read=1200,
                    texts_completed=1,
                    goal_met=True,
                ),
                Streak(user_id=user_id, current=0, longest=3, last_active_day=None),
            ]
        )
        session.commit()

    mine = achievements(headers)
    theirs = achievements(other)

    assert [a["id"] for a in theirs] == [a.id for a in CATALOG]
    assert not any(a["unlocked"] for a in theirs)
    assert set(theirs[0]) == {
        "id", "title", "description", "icon", "target", "current", "unlocked"
    }  # fmt: skip
    assert {a["id"] for a in mine if a["unlocked"]} == {
        "first-text",
        "words-1k",
        "goal-1",
        "streak-3",  # maior ofensiva, mesmo com a atual zerada
    }
    words_10k = next(a for a in mine if a["id"] == "words-10k")
    assert (words_10k["current"], words_10k["target"]) == (1200, 10000)


# --- POST /reading/progress: achievements_unlocked ---


def read(user_id: int, headers: dict[str, str], article_id: int, progress: int) -> Any:
    """Um envio de 15 s dentro da sessão (teto de 150 palavras), após 20 s simulados."""
    pretend_time_passed(user_id, article_id, 20)
    return post(headers, article_id=article_id, progress=progress, seconds=15).json()


def ids(response: Any) -> list[str]:
    return [a["id"] for a in response["achievements_unlocked"]]


def test_crossing_1000_words_unlocks_words_1k_exactly_once(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    with Session(engine) as session:  # 950 palavras já lidas hoje
        session.add(DailyStats(user_id=user_id, day=local_today(), words_read=950))
        session.commit()
    open_session(user_id, headers, article_id)

    crossed = read(user_id, headers, article_id, 30)  # +90 → 1.040
    after = read(user_id, headers, article_id, 60)  # +90 → 1.130

    assert ids(crossed) == ["words-1k"]
    assert crossed["achievements_unlocked"][0] == {
        "id": "words-1k",
        "title": "Mil palavras",
        "icon": "reader-outline",
    }
    assert ids(after) == []


def test_first_completed_text_and_first_goal(
    make_user: MakeUser, make_article: MakeArticle
) -> None:
    user_id, headers = make_user()
    assert client.put("/goals", json={"target": 50}, headers=headers).status_code == 200
    short = make_article(60)
    open_session(user_id, headers, short)

    done = read(user_id, headers, short, 100)  # 60 palavras: conclui e cumpre a meta de 50
    again = read(user_id, headers, short, 100)

    assert (done["completed"], done["goal_met"]) == (True, True)
    assert ids(done) == ["first-text", "goal-1"]
    assert ids(again) == []


def test_send_without_progress_returns_empty_list(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    read(user_id, headers, article_id, 30)

    still = read(user_id, headers, article_id, 30)  # mesmo progresso: só tempo
    opening = post(headers, article_id=article_id, progress=0, seconds=0).json()

    assert (still["words_credited"], ids(still)) == (0, [])
    assert ids(opening) == []
