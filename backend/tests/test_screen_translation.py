import base64
from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import engine
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.vocabulary import translator, vision
from app.vocabulary.models import SentenceTranslation
from app.vocabulary.screen import DAILY_AI_LIMIT, DAILY_SCREEN_LIMIT
from tests.conftest import MakeUser, client

JPEG = base64.b64encode(b"\xff\xd8\xff\xe0" + b"0" * 64).decode()


@pytest.fixture
def calls(monkeypatch: pytest.MonkeyPatch) -> list[str]:
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


@pytest.fixture
def ai(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """IA configurada e falsa; registra as imagens enviadas. Janela da conta zerada por teste."""
    sent: list[str] = []
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setattr(vision, "limiter", vision.RateLimiter(vision.REQUESTS_PER_MINUTE))

    def translate_image(url: str) -> tuple[str, str] | None:
        sent.append(url)
        return "WHAT?!", "O QUÊ?!"

    monkeypatch.setattr(vision, "translate_image", translate_image)
    return sent


def _fill(user_id: int, **counters: int) -> None:
    with Session(engine) as session:
        session.execute(
            insert(DailyStats)
            .values(user_id=user_id, day=local_today(), **counters)
            .on_conflict_do_update(
                index_elements=[DailyStats.user_id, DailyStats.day], set_=counters
            )
        )
        session.commit()


def test_text_needs_login() -> None:
    assert client.post("/vocabulary/translate-text", json={"text": "Hi"}).status_code == 401


def test_translates_screen_text_and_caches_it(make_user: MakeUser, calls: list[str]) -> None:
    _, headers = make_user()
    body = {"text": "I   can't believe\nit!"}
    first = client.post("/vocabulary/translate-text", json=body, headers=headers)
    second = client.post("/vocabulary/translate-text", json=body, headers=headers)
    assert first.status_code == 200
    assert first.json() == {"text": "I can't believe it!", "translation": "pt: I can't believe it!"}
    assert second.json() == first.json()
    assert calls == ["I can't believe it!"]  # a segunda veio do cache


def test_text_without_letters_and_too_long_are_rejected(
    make_user: MakeUser, calls: list[str]
) -> None:
    _, headers = make_user()
    for text in ("?! ...", "a" * 451):
        response = client.post("/vocabulary/translate-text", json={"text": text}, headers=headers)
        assert response.status_code == 422
    assert calls == []


def test_screen_text_daily_limit(make_user: MakeUser, calls: list[str]) -> None:
    user_id, headers = make_user()
    _fill(user_id, screen_translations=DAILY_SCREEN_LIMIT)
    response = client.post("/vocabulary/translate-text", json={"text": "Hello"}, headers=headers)
    assert response.status_code == 429
    assert calls == []


def test_image_without_key_is_unavailable(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    _, headers = make_user()
    response = client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=headers)
    assert response.status_code == 503


def test_translates_image_with_ai(make_user: MakeUser, ai: list[str]) -> None:
    _, headers = make_user()
    response = client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"text": "WHAT?!", "translation": "O QUÊ?!"}
    assert ai == [f"data:image/jpeg;base64,{JPEG}"]


def test_image_must_be_jpeg_or_png(make_user: MakeUser, ai: list[str]) -> None:
    _, headers = make_user()
    for image in ("not base64!", base64.b64encode(b"GIF89a....").decode()):
        response = client.post(
            "/vocabulary/translate-image", json={"image": image}, headers=headers
        )
        assert response.status_code == 422
    assert ai == []


def test_ai_daily_limit(make_user: MakeUser, ai: list[str]) -> None:
    user_id, headers = make_user()
    _fill(user_id, ai_translations=DAILY_AI_LIMIT)
    response = client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=headers)
    assert response.status_code == 429
    assert ai == []


def test_ai_account_window_is_shared(
    make_user: MakeUser, ai: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(vision, "limiter", vision.RateLimiter(1))
    _, first = make_user()
    _, second = make_user()
    assert (
        client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=first).status_code
        == 200
    )
    response = client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=second)
    assert response.status_code == 429
    assert "instantes" in response.json()["detail"]


def test_ai_failure_is_bad_gateway(
    make_user: MakeUser, ai: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(vision, "translate_image", lambda url: None)
    _, headers = make_user()
    response = client.post("/vocabulary/translate-image", json={"image": JPEG}, headers=headers)
    assert response.status_code == 502


def test_oversized_image_body_is_cut() -> None:
    response = client.post(
        "/vocabulary/translate-image",
        content=b'{"image": "' + b"A" * (3 * 1024 * 1024) + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_rate_limiter_window() -> None:
    limiter = vision.RateLimiter(2, window=60)
    assert [limiter.try_acquire() for _ in range(3)] == [True, True, False]


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ('{"original": "HEY!", "translation": "EI!"}', ("HEY!", "EI!")),
        (
            '```json\n{"original": "Run\\n  now", "translation": "Corra agora"}\n```',
            ("Run now", "Corra agora"),
        ),
        ('{"original": "", "translation": ""}', ("", "")),
        ("Sorry, I can't.", None),
        ('{"original": 1, "translation": "x"}', None),
        (None, None),
    ],
)
def test_parse_answer(content: object, expected: tuple[str, str] | None) -> None:
    assert vision.parse_answer(content) == expected
