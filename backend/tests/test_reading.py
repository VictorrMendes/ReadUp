import pytest

from app.reading.rules import credit, progress_percent
from tests.conftest import (
    MakeArticle,
    MakeUser,
    client,
    open_session,
    post,
    pretend_time_passed,
    today_stats,
)

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


def test_requires_token() -> None:
    response = client.post(
        "/reading/progress", json={"article_id": 1, "progress": 10, "seconds": 5}
    )
    assert response.status_code == 401


def test_missing_article_is_404(make_user: MakeUser) -> None:
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
def test_invalid_body_is_422(make_user: MakeUser, article_id: int, body: dict[str, int]) -> None:
    _, headers = make_user()
    assert post(headers, article_id=article_id, **body).status_code == 422


def test_first_send_only_opens_session(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()

    first = post(headers, article_id=article_id, progress=100, seconds=120).json()

    assert first == {
        "progress": 0,
        "words_read": 0,
        "words_credited": 0,
        "completed": False,
        "xp_gained": 0,
        "goal_met": False,
        "streak": 0,
        "streak_active_today": False,
        "achievements_unlocked": [],
    }
    assert today_stats(user_id) is None


def test_reading_in_steps_credits_and_sums_daily_stats(
    make_user: MakeUser, article_id: int
) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)

    first = post(headers, article_id=article_id, progress=30, seconds=15).json()
    pretend_time_passed(user_id, article_id, 20)
    second = post(headers, article_id=article_id, progress=60, seconds=15).json()

    assert (first["progress"], first["words_read"], first["words_credited"]) == (30, 90, 90)
    assert (second["progress"], second["words_read"], second["words_credited"]) == (60, 180, 90)
    assert (first["completed"], second["completed"]) == (False, False)
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.seconds_read, stats.texts_completed) == (180, 30, 0)


def test_long_gap_restarts_session(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    post(headers, article_id=article_id, progress=30, seconds=15)

    pretend_time_passed(user_id, article_id, 400)  # > SESSION_GAP_SECONDS
    reopened = post(headers, article_id=article_id, progress=100, seconds=120).json()
    pretend_time_passed(user_id, article_id, 20)
    resumed = post(headers, article_id=article_id, progress=100, seconds=15).json()

    assert (reopened["words_credited"], reopened["xp_gained"]) == (0, 0)
    assert resumed["words_credited"] == 150  # teto: 15 s x 10 palavras/s
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.seconds_read) == (240, 30)


def test_back_to_back_calls_do_not_add_time_that_did_not_pass(
    make_user: MakeUser, article_id: int
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


def test_completion_counts_once(make_user: MakeUser, article_id: int) -> None:
    user_id, headers = make_user()
    open_session(user_id, headers, article_id)
    pretend_time_passed(user_id, article_id, 40)

    done = post(headers, article_id=article_id, progress=100, seconds=60).json()
    pretend_time_passed(user_id, article_id, 60)
    again = post(headers, article_id=article_id, progress=100, seconds=60).json()

    assert (done["progress"], done["words_read"], done["words_credited"]) == (100, 300, 300)
    assert done["completed"] is True
    assert again["completed"] is True
    assert again["words_credited"] == 0
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.words_read, stats.texts_completed) == (300, 1)


def test_articles_show_progress_of_logged_user_only(make_user: MakeUser, article_id: int) -> None:
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


def test_two_open_texts_share_the_same_real_time(
    make_user: MakeUser, make_article: MakeArticle
) -> None:
    user_id, headers = make_user()
    first, second = make_article(300), make_article(300)
    post(headers, article_id=first, progress=0, seconds=0)  # abre os dois
    post(headers, article_id=second, progress=0, seconds=0)

    pretend_time_passed(user_id, None, 20)  # 20 s reais para tudo
    a1 = post(headers, article_id=first, progress=100, seconds=15).json()
    b1 = post(headers, article_id=second, progress=100, seconds=15).json()
    pretend_time_passed(user_id, None, 20)  # mais 20 s reais
    b2 = post(headers, article_id=second, progress=100, seconds=15).json()
    a2 = post(headers, article_id=first, progress=100, seconds=15).json()

    # cada envio logo após o do outro texto não tem tempo novo: 40 s reais, 30 s creditados
    assert [r["words_credited"] for r in (a1, b1, b2, a2)] == [150, 0, 150, 0]
    stats = today_stats(user_id)
    assert stats is not None
    assert (stats.seconds_read, stats.words_read) == (30, 300)
    assert stats.seconds_read <= 40 and stats.words_read <= 40 * 10
