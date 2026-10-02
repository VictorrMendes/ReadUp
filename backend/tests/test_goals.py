import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.security import create_access_token
from app.db import engine
from app.goals.models import ReadingGoal
from app.goals.service import GoalStatus, goal_status
from app.main import app
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.users.models import User
from tests.conftest import MakeUser, open_session, post, pretend_time_passed

client = TestClient(app)


@pytest.mark.parametrize(
    ("target", "words", "expected"),
    [
        (None, 120, GoalStatus(target=None, words_today=120, remaining=0, completed=False)),
        (500, 120, GoalStatus(target=500, words_today=120, remaining=380, completed=False)),
        (500, 500, GoalStatus(target=500, words_today=500, remaining=0, completed=True)),
        (500, 800, GoalStatus(target=500, words_today=800, remaining=0, completed=True)),
    ],
)
def test_goal_status(target: int | None, words: int, expected: GoalStatus) -> None:
    assert goal_status(target, words) == expected


def test_goal_met_today_stays_completed_when_target_goes_up() -> None:
    # bateu 100, subiu para 1000: o dia continua cumprido (como a ofensiva em /stats)
    assert goal_status(1000, 120, met_today=True) == GoalStatus(
        target=1000, words_today=120, remaining=0, completed=True
    )


@pytest.fixture
def user() -> Iterator[tuple[int, dict[str, str]]]:
    with Session(engine) as session:
        u = User(name="T", email=f"goal-{uuid.uuid4().hex}@example.com", password_hash="x")
        session.add(u)
        session.commit()
        user_id = u.id
    yield user_id, {"Authorization": f"Bearer {create_access_token(user_id)}"}
    with Session(engine) as session:  # cascade: reading_goals e daily_stats
        session.execute(delete(User).where(User.id == user_id))
        session.commit()


def goals_of(user_id: int) -> list[tuple[int, bool]]:
    with Session(engine) as session:
        rows = session.execute(
            select(ReadingGoal.target, ReadingGoal.active)
            .where(ReadingGoal.user_id == user_id)
            .order_by(ReadingGoal.id)
        )
        return [(target, active) for target, active in rows]


def put_goal(headers: dict[str, str], target: Any) -> Any:
    return client.put("/goals", json={"target": target}, headers=headers)


def test_requires_token() -> None:
    assert client.get("/goals").status_code == 401
    assert client.put("/goals", json={"target": 500}).status_code == 401
    assert client.patch("/users/me", json={"english_level": "B1"}).status_code == 401


def test_get_without_goal(user: tuple[int, dict[str, str]]) -> None:
    _, headers = user

    response = client.get("/goals", headers=headers)

    assert response.json() == {"target": None, "words_today": 0, "remaining": 0, "completed": False}


def test_put_creates_goal_and_get_uses_words_of_today(user: tuple[int, dict[str, str]]) -> None:
    user_id, headers = user
    with Session(engine) as session:
        session.add(DailyStats(user_id=user_id, day=local_today(), words_read=120))
        session.commit()

    put = put_goal(headers, 500)
    got = client.get("/goals", headers=headers)

    expected = {"target": 500, "words_today": 120, "remaining": 380, "completed": False}
    assert put.status_code == 200
    assert put.json() == expected
    assert got.json() == expected


def test_put_other_value_keeps_history(user: tuple[int, dict[str, str]]) -> None:
    user_id, headers = user

    put_goal(headers, 500)
    put_goal(headers, 1000)

    assert goals_of(user_id) == [(500, False), (1000, True)]


def test_put_same_value_does_not_duplicate(user: tuple[int, dict[str, str]]) -> None:
    user_id, headers = user

    put_goal(headers, 500)
    put_goal(headers, 500)

    assert goals_of(user_id) == [(500, True)]


@pytest.mark.parametrize("target", [49, 10001, "muito"])
def test_put_out_of_range_is_422(user: tuple[int, dict[str, str]], target: Any) -> None:
    _, headers = user
    assert put_goal(headers, target).status_code == 422


def test_users_me_includes_daily_goal_and_patch_level(user: tuple[int, dict[str, str]]) -> None:
    _, headers = user
    before = client.get("/users/me", headers=headers).json()

    put_goal(headers, 300)
    patched = client.patch("/users/me", json={"english_level": "B1"}, headers=headers)

    assert (before["english_level"], before["daily_goal"]) == (None, None)
    assert patched.status_code == 200
    assert (patched.json()["english_level"], patched.json()["daily_goal"]) == ("B1", 300)
    assert "password_hash" not in patched.json()
    assert client.get("/users/me", headers=headers).json()["english_level"] == "B1"


@pytest.mark.parametrize("level", ["Z9", "b1", None, ""])
def test_patch_invalid_level_is_422(user: tuple[int, dict[str, str]], level: Any) -> None:
    _, headers = user
    response = client.patch("/users/me", json={"english_level": level}, headers=headers)
    assert response.status_code == 422


def test_lowering_goal_below_todays_words_meets_it_once(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    put_goal(headers, 500)
    open_session(user_id, headers, article_id)
    pretend_time_passed(user_id, article_id, 20)
    read = post(headers, article_id=article_id, progress=40, seconds=15).json()  # 120 palavras

    lowered = put_goal(headers, 100)
    after_lower = client.get("/stats/summary", headers=headers).json()
    put_goal(headers, 60)  # baixar de novo no mesmo dia
    raised = put_goal(headers, 500)
    put_goal(headers, 100)
    after_again = client.get("/stats/summary", headers=headers).json()

    assert (read["words_credited"], read["goal_met"], read["xp_gained"]) == (120, False, 12)
    assert lowered.json()["completed"] is True
    # subir a meta depois de cumprida não contradiz a ofensiva já contada hoje
    assert (raised.json()["completed"], raised.json()["remaining"]) == (True, 0)
    assert client.get("/goals", headers=headers).json()["completed"] is True
    assert (after_lower["xp_today"], after_lower["streak_current"]) == (12 + 50, 1)
    assert after_lower["streak_active_today"] is True
    assert (after_again["xp_today"], after_again["streak_current"]) == (12 + 50, 1)
    with Session(engine) as session:
        stats = session.scalar(
            select(DailyStats).where(DailyStats.user_id == user_id, DailyStats.day == local_today())
        )
    assert stats is not None and stats.goal_met is True


def test_goal_change_without_reading_today_creates_nothing(
    user: tuple[int, dict[str, str]],
) -> None:
    user_id, headers = user

    put_goal(headers, 50)

    with Session(engine) as session:
        assert session.scalar(select(DailyStats).where(DailyStats.user_id == user_id)) is None
