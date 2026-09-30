from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from sqlalchemy.orm import Session

from app.db import engine
from app.gamification.models import Streak
from app.gamification.streak import effective_streak, next_streak
from app.stats.service import local_today
from tests.conftest import MakeUser, client, open_session, post, pretend_time_passed

TODAY = date(2026, 3, 10)
YESTERDAY = TODAY - timedelta(days=1)
TWO_DAYS_AGO = TODAY - timedelta(days=2)

# --- regras puras ---


@pytest.mark.parametrize(
    ("current", "longest", "last_active_day", "expected"),
    [
        pytest.param(0, 0, None, (1, 1), id="primeiro dia"),
        pytest.param(3, 3, YESTERDAY, (4, 4), id="dia seguinte soma e longest acompanha"),
        pytest.param(3, 7, YESTERDAY, (4, 7), id="dia seguinte abaixo do recorde"),
        pytest.param(3, 3, TODAY, (3, 3), id="mesmo dia não soma de novo"),
        pytest.param(5, 5, TWO_DAYS_AGO, (1, 5), id="pulou um dia: volta a 1, longest fica"),
    ],
)
def test_next_streak(
    current: int, longest: int, last_active_day: date | None, expected: tuple[int, int]
) -> None:
    assert next_streak(current, longest, last_active_day, TODAY) == expected


@pytest.mark.parametrize(
    ("last_active_day", "expected"),
    [(TODAY, 4), (YESTERDAY, 4), (TWO_DAYS_AGO, 0), (None, 0)],
)
def test_effective_streak(last_active_day: date | None, expected: int) -> None:
    assert effective_streak(4, last_active_day, TODAY) == expected


def test_local_today_follows_app_timezone() -> None:
    # America/Sao_Paulo é UTC-3: o dia vira às 03:00 UTC
    assert local_today(datetime(2026, 3, 10, 2, 30, tzinfo=UTC)) == date(2026, 3, 9)
    assert local_today(datetime(2026, 3, 10, 3, 30, tzinfo=UTC)) == date(2026, 3, 10)


# --- fluxo: POST /reading/progress + GET /stats/summary ---


def read(user_id: int, headers: dict[str, str], article_id: int, progress: int) -> Any:
    """Um envio de 15 s dentro da sessão (teto de 150 palavras), após 20 s simulados."""
    pretend_time_passed(user_id, article_id, 20)
    return post(headers, article_id=article_id, progress=progress, seconds=15).json()


def set_goal(headers: dict[str, str], target: int) -> None:
    assert client.put("/goals", json={"target": target}, headers=headers).status_code == 200


def streak_summary(headers: dict[str, str]) -> tuple[int, int, bool]:
    body = client.get("/stats/summary", headers=headers).json()
    return body["streak_current"], body["streak_longest"], body["streak_active_today"]


def set_day(monkeypatch: pytest.MonkeyPatch, day: date) -> None:
    monkeypatch.setattr("app.stats.service.local_today", lambda: day)


def test_meeting_the_goal_on_consecutive_days_builds_the_streak_and_a_gap_resets_it(
    make_user: MakeUser, article_id: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id, headers = make_user()
    set_goal(headers, 50)
    open_session(user_id, headers, article_id)

    set_day(monkeypatch, TODAY)
    first = read(user_id, headers, article_id, 30)  # 90 palavras: cumpre a meta
    same_day = read(user_id, headers, article_id, 40)  # continua lendo: não conta de novo
    day_one = streak_summary(headers)

    set_day(monkeypatch, TODAY + timedelta(days=1))
    before_reading = streak_summary(headers)
    second = read(user_id, headers, article_id, 60)
    day_two = streak_summary(headers)

    set_day(monkeypatch, TODAY + timedelta(days=3))  # pulou um dia
    broken = streak_summary(headers)
    third = read(user_id, headers, article_id, 90)
    day_four = streak_summary(headers)

    assert (first["goal_met"], first["streak"], same_day["streak"]) == (True, 1, 1)
    assert day_one == (1, 1, True)
    assert before_reading == (1, 1, False)
    assert (second["streak"], day_two) == (2, (2, 2, True))
    assert broken == (0, 2, False)
    assert (third["streak"], day_four) == (1, (1, 2, True))


def test_reading_without_meeting_the_goal_does_not_change_the_streak(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    set_goal(headers, 50)
    open_session(user_id, headers, article_id)

    result = read(user_id, headers, article_id, 10)  # 30 palavras

    assert (result["goal_met"], result["streak"]) == (False, 0)
    assert streak_summary(headers) == (0, 0, False)
    with Session(engine) as session:
        assert session.get(Streak, user_id) is None


def test_without_active_goal_the_day_never_counts(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    result = read(user_id, headers, article_id, 50)  # 150 palavras, sem meta

    assert (result["goal_met"], result["streak"]) == (False, 0)
    assert streak_summary(headers) == (0, 0, False)


# --- exibição ---


@pytest.mark.parametrize(
    ("days_ago", "expected"),
    [(0, (3, 5, True)), (1, (3, 5, False)), (2, (0, 5, False))],
)
def test_summary_shows_effective_streak_per_user(
    make_user: MakeUser, days_ago: int, expected: tuple[int, int, bool]
) -> None:
    user_id, headers = make_user()
    _, other_headers = make_user()
    with Session(engine) as session:
        session.add(
            Streak(
                user_id=user_id,
                current=3,
                longest=5,
                last_active_day=local_today() - timedelta(days=days_ago),
            )
        )
        session.commit()

    assert streak_summary(headers) == expected
    assert streak_summary(other_headers) == (0, 0, False)
