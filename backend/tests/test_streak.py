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


def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


@pytest.mark.parametrize(
    ("current", "longest", "freezes", "last_active_day", "expected"),
    [
        pytest.param(0, 0, 0, None, (1, 1, 2), id="primeiro dia: começa com 2 escudos"),
        pytest.param(3, 3, 2, YESTERDAY, (4, 4, 2), id="dia seguinte soma, escudos intactos"),
        pytest.param(3, 7, 2, YESTERDAY, (4, 7, 2), id="dia seguinte abaixo do recorde"),
        pytest.param(3, 3, 2, TODAY, (3, 3, 2), id="mesmo dia não soma de novo"),
        pytest.param(5, 5, 2, TWO_DAYS_AGO, (6, 6, 1), id="1 dia em branco gasta 1 escudo"),
        pytest.param(5, 5, 2, days_ago(3), (6, 6, 0), id="2 dias em branco gastam os 2"),
        pytest.param(5, 5, 2, days_ago(4), (1, 5, 2), id="3 em branco: recomeça com 2 escudos"),
        pytest.param(5, 5, 0, TWO_DAYS_AGO, (1, 5, 2), id="sem escudo: recomeça"),
        pytest.param(6, 6, 0, YESTERDAY, (7, 7, 1), id="7º dia devolve 1 escudo"),
        pytest.param(13, 13, 2, YESTERDAY, (14, 14, 2), id="recarga não passa de 2"),
        pytest.param(0, 4, 0, days_ago(9), (1, 4, 2), id="quebrada (current 0) recomeça"),
    ],
)
def test_next_streak(
    current: int,
    longest: int,
    freezes: int,
    last_active_day: date | None,
    expected: tuple[int, int, int],
) -> None:
    assert next_streak(current, longest, freezes, last_active_day, TODAY) == expected


@pytest.mark.parametrize(
    ("freezes", "last_active_day", "expected"),
    [
        pytest.param(2, TODAY, (4, 2), id="contou hoje"),
        pytest.param(2, YESTERDAY, (4, 2), id="contou ontem: hoje ainda dá"),
        pytest.param(2, TWO_DAYS_AGO, (4, 1), id="ontem em branco: 1 escudo já conta gasto"),
        pytest.param(1, days_ago(3), (0, 0), id="2 em branco com 1 escudo: quebrou"),
        pytest.param(2, None, (0, 0), id="nunca leu"),
    ],
)
def test_effective_streak(
    freezes: int, last_active_day: date | None, expected: tuple[int, int]
) -> None:
    assert effective_streak(4, freezes, last_active_day, TODAY) == expected


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


def streak_summary(headers: dict[str, str]) -> tuple[int, int, bool, int]:
    body = client.get("/stats/summary", headers=headers).json()
    return (
        body["streak_current"],
        body["streak_longest"],
        body["streak_active_today"],
        body["streak_freezes"],
    )


def set_day(monkeypatch: pytest.MonkeyPatch, day: date) -> None:
    monkeypatch.setattr("app.stats.service.local_today", lambda: day)


def test_daily_minimum_builds_the_streak_shields_cover_gaps_and_a_long_gap_resets_it(
    make_user: MakeUser, article_id: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_id, headers = make_user()
    set_goal(headers, 500)  # meta alta: a ofensiva não depende dela
    open_session(user_id, headers, article_id)

    set_day(monkeypatch, TODAY)
    first = read(user_id, headers, article_id, 20)  # 60 palavras: mínimo do dia
    same_day = read(user_id, headers, article_id, 30)  # continua lendo: não conta de novo
    day_one = streak_summary(headers)

    set_day(monkeypatch, TODAY + timedelta(days=1))
    before_reading = streak_summary(headers)
    second = read(user_id, headers, article_id, 50)
    day_two = streak_summary(headers)

    set_day(monkeypatch, TODAY + timedelta(days=3))  # um dia em branco: o escudo cobre
    covered = streak_summary(headers)
    third = read(user_id, headers, article_id, 70)
    day_four = streak_summary(headers)

    set_day(monkeypatch, TODAY + timedelta(days=7))  # 3 dias em branco, 1 escudo: quebrou
    broken = streak_summary(headers)
    fourth = read(user_id, headers, article_id, 90)
    day_eight = streak_summary(headers)

    assert (first["goal_met"], first["streak"], first["streak_active_today"]) == (False, 1, True)
    assert same_day["streak"] == 1
    assert day_one == (1, 1, True, 2)
    assert before_reading == (1, 1, False, 2)
    assert (second["streak"], day_two) == (2, (2, 2, True, 2))
    assert covered == (2, 2, False, 1)
    assert (third["streak"], day_four) == (3, (3, 3, True, 1))
    assert broken == (0, 3, False, 0)
    assert (fourth["streak"], day_eight) == (1, (1, 3, True, 2))


def test_reading_below_the_daily_minimum_does_not_count(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    below = read(user_id, headers, article_id, 10)  # 30 palavras
    with Session(engine) as session:
        untouched = session.get(Streak, user_id) is None
    reached = read(user_id, headers, article_id, 20)  # +30 = 60 palavras no dia

    assert (below["streak"], below["streak_active_today"]) == (0, False)
    assert untouched
    assert (reached["streak"], reached["streak_active_today"]) == (1, True)


def test_without_active_goal_the_daily_minimum_still_counts(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    result = read(user_id, headers, article_id, 50)  # 150 palavras, sem meta

    assert (result["goal_met"], result["streak"]) == (False, 1)
    assert streak_summary(headers) == (1, 1, True, 2)


# --- exibição ---


@pytest.mark.parametrize(
    ("days_ago", "freezes", "expected"),
    [
        (0, 2, (3, 5, True, 2)),
        (1, 2, (3, 5, False, 2)),
        (2, 2, (3, 5, False, 1)),  # ontem em branco: o escudo segura
        (2, 0, (0, 5, False, 0)),  # sem escudo: quebrou
    ],
)
def test_summary_shows_effective_streak_per_user(
    make_user: MakeUser, days_ago: int, freezes: int, expected: tuple[int, int, bool, int]
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
                freezes=freezes,
            )
        )
        session.commit()

    assert streak_summary(headers) == expected
    assert streak_summary(other_headers) == (0, 0, False, 0)
