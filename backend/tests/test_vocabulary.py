import json
import uuid
from collections.abc import Callable, Iterator
from typing import Any
from urllib.error import HTTPError

import pytest
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import engine
from app.vocabulary import translator
from app.vocabulary.models import SavedWord, WordTranslation
from app.vocabulary.words import normalize_word
from tests.conftest import MakeUser, client

# --- normalize_word ---


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Don't,", "don't"),
        ("Don’t", "don't"),
        ("well-known.", "well-known"),
        ("  Hello! ", "hello"),
        ("café", "café"),
        ("a" * 40, "a" * 40),
    ],
)
def test_normalize_word_accepts_a_single_word(text: str, expected: str) -> None:
    assert normalize_word(text) == expected


@pytest.mark.parametrize(
    "text",
    ["", "   ", "...", "two words", "abc123", "42", "<b>", "a<b", "x>y", "a--b", "a" * 41],
)
def test_normalize_word_rejects_anything_else(text: str) -> None:
    assert normalize_word(text) is None


# --- translator (urlopen simulado; sem rede) ---


class FakeResponse:
    def __init__(self, body: bytes) -> None:
        self.body = body

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        pass

    def read(self, size: int) -> bytes:
        return self.body[:size]


def mymemory(text: str, status: int | str = 200, quota_finished: bool = False) -> bytes:
    return json.dumps(
        {
            "responseData": {"translatedText": text},
            "quotaFinished": quota_finished,
            "responseStatus": status,
        }
    ).encode()


def fake_urlopen(monkeypatch: pytest.MonkeyPatch, result: bytes | Exception) -> list[Any]:
    calls: list[Any] = []

    def urlopen(url: str, timeout: float) -> FakeResponse:
        calls.append((url, timeout))
        if isinstance(result, Exception):
            raise result
        return FakeResponse(result)

    monkeypatch.setattr(translator, "urlopen", urlopen)
    return calls


def test_translate_returns_translation_and_sends_only_the_word(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("MYMEMORY_EMAIL", raising=False)
    calls = fake_urlopen(monkeypatch, mymemory(" casa "))

    assert translator.translate("house") == "casa"
    assert calls == [
        ("https://api.mymemory.translated.net/get?q=house&langpair=en%7Cpt-BR", 4),
    ]


def test_translate_sends_owner_email_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MYMEMORY_EMAIL", "owner@example.com")
    calls = fake_urlopen(monkeypatch, mymemory("casa"))

    translator.translate("don't")

    assert calls[0][0] == (
        "https://api.mymemory.translated.net/get?q=don%27t&langpair=en%7Cpt-BR&de=owner%40example.com"
    )


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("farol.", "farol"),
        (" Manhã! ", "Manhã"),
        ('"bem conhecido",', "bem conhecido"),
        (".", None),
    ],
)
def test_translate_strips_punctuation_from_the_edges(
    monkeypatch: pytest.MonkeyPatch, text: str, expected: str | None
) -> None:
    fake_urlopen(monkeypatch, mymemory(text))

    assert translator.translate("word") == expected


@pytest.mark.parametrize(
    "result",
    [
        pytest.param(TimeoutError("timed out"), id="timeout"),
        pytest.param(HTTPError("url", 429, "Too Many Requests", {}, None), id="http de erro"),  # type: ignore[arg-type]
        pytest.param(b"<html>not json</html>", id="json inválido"),
        pytest.param(b"[]", id="json de outro formato"),
        pytest.param(
            mymemory("MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY", 429),
            id="aviso de cota",
        ),
        pytest.param(mymemory("casa", quota_finished=True), id="cota esgotada"),
        pytest.param(mymemory("'XX' IS AN INVALID TARGET LANGUAGE", "403"), id="status no corpo"),
        pytest.param(mymemory(""), id="tradução vazia"),
        pytest.param(mymemory("x" * 101), id="tradução longa demais"),
        pytest.param(b" " * 70_000, id="resposta grande demais"),
    ],
)
def test_translate_returns_none_on_any_failure(
    monkeypatch: pytest.MonkeyPatch, result: bytes | Exception
) -> None:
    fake_urlopen(monkeypatch, result)

    assert translator.translate("house") is None


# --- endpoints ---


@pytest.fixture
def word() -> Iterator[str]:
    """Palavra única (só letras); apaga a linha de cache que o teste criar."""
    value = "zq" + "".join(chr(97 + int(c, 16)) for c in uuid.uuid4().hex[:12])
    yield value
    with Session(engine) as session:
        session.execute(delete(WordTranslation).where(WordTranslation.word == value))
        session.commit()


Translate = Callable[[str | None], list[str]]


@pytest.fixture
def fake_translate(monkeypatch: pytest.MonkeyPatch) -> Translate:
    """Troca o tradutor por um que devolve `result`; a lista registra as palavras pedidas."""

    def install(result: str | None) -> list[str]:
        calls: list[str] = []

        def translate(text: str) -> str | None:
            calls.append(text)
            return result

        monkeypatch.setattr(translator, "translate", translate)
        return calls

    return install


def cached(word: str) -> str | None:
    with Session(engine) as session:
        return session.scalar(
            select(WordTranslation.translation).where(WordTranslation.word == word)
        )


def lookup(headers: dict[str, str], word: str) -> Any:
    return client.get("/vocabulary/lookup", params={"word": word}, headers=headers)


def save(headers: dict[str, str], **body: Any) -> Any:
    return client.post("/vocabulary", json=body, headers=headers)


def test_requires_token() -> None:
    assert client.get("/vocabulary/lookup", params={"word": "house"}).status_code == 401
    assert client.post("/vocabulary", json={"word": "house"}).status_code == 401
    assert client.get("/vocabulary").status_code == 401
    assert client.delete("/vocabulary/1").status_code == 401


@pytest.mark.parametrize("text", ["two words", "abc123", "<script>", "", "a" * 41])
def test_lookup_invalid_word_is_422(
    make_user: MakeUser, fake_translate: Translate, text: str
) -> None:
    _, headers = make_user()
    calls = fake_translate("nunca")

    assert lookup(headers, text).status_code == 422
    assert calls == []


def test_lookup_miss_calls_translator_once_and_caches(
    make_user: MakeUser, fake_translate: Translate, word: str
) -> None:
    _, headers = make_user()
    calls = fake_translate("tradução")

    first = lookup(headers, f" {word.capitalize()}, ")
    second = lookup(headers, word)

    assert first.status_code == 200
    assert first.json() == {
        "word": word,
        "translation": "tradução",
        "saved": False,
        "saved_id": None,
    }
    assert second.json() == first.json()
    assert calls == [word]  # o segundo veio do cache
    assert cached(word) == "tradução"


def test_lookup_failure_returns_null_and_is_not_cached(
    make_user: MakeUser, fake_translate: Translate, word: str
) -> None:
    _, headers = make_user()
    calls = fake_translate(None)

    first = lookup(headers, word)
    lookup(headers, word)

    assert first.json() == {
        "word": word,
        "translation": None,
        "saved": False,
        "saved_id": None,
    }
    assert calls == [word, word]  # falha não é cacheada: tenta de novo
    assert cached(word) is None


def test_lookup_survives_concurrent_request_caching_the_same_word(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch, word: str
) -> None:
    _, headers = make_user()

    def translate(text: str) -> str:
        # outro pedido da mesma palavra grava no cache enquanto este espera o serviço
        with Session(engine) as session:
            session.execute(insert(WordTranslation).values(word=text, translation="primeira"))
            session.commit()
        return "segunda"

    monkeypatch.setattr(translator, "translate", translate)

    response = lookup(headers, word)

    assert response.status_code == 200
    assert cached(word) == "primeira"


def test_lookup_saved_reflects_the_logged_user(
    make_user: MakeUser, fake_translate: Translate, word: str
) -> None:
    _, headers = make_user()
    _, other_headers = make_user()
    fake_translate("tradução")
    word_id = save(headers, word=word).json()["id"]

    mine = lookup(headers, word).json()
    theirs = lookup(other_headers, word).json()

    assert (mine["saved"], mine["saved_id"]) == (True, word_id)
    assert (theirs["saved"], theirs["saved_id"]) == (False, None)


def test_save_is_idempotent_and_ignores_client_translation(
    make_user: MakeUser, fake_translate: Translate, word: str, article_id: int
) -> None:
    user_id, headers = make_user()
    fake_translate("do servidor")

    created = save(
        headers,
        word=f"{word.upper()}!",
        article_id=article_id,
        context="  A sentence with the word.  ",
        translation="do cliente",
    )
    again = save(headers, word=word, context="Another sentence.")

    assert (created.status_code, again.status_code) == (201, 200)
    body = created.json()
    assert (body["word"], body["translation"]) == (word, "do servidor")
    assert (body["context"], body["article_id"]) == ("A sentence with the word.", article_id)
    assert body["article_title"].startswith("test-")
    assert again.json() == body  # a existente, sem alterar
    with Session(engine) as session:
        rows = session.scalars(select(SavedWord).where(SavedWord.user_id == user_id)).all()
    assert len(rows) == 1


def test_save_without_translation_available_still_saves(
    make_user: MakeUser, fake_translate: Translate, word: str
) -> None:
    _, headers = make_user()
    fake_translate(None)

    response = save(headers, word=word)

    assert response.status_code == 201
    assert response.json()["translation"] is None
    assert (response.json()["article_id"], response.json()["article_title"]) == (None, None)


def test_word_saved_without_translation_gets_it_from_the_cache_later(
    make_user: MakeUser, fake_translate: Translate, word: str
) -> None:
    _, headers = make_user()
    fake_translate(None)
    saved = save(headers, word=word).json()
    before = client.get("/vocabulary", headers=headers).json()

    fake_translate("chegou depois")
    lookup(headers, word)  # o cache ganha a tradução
    after = client.get("/vocabulary", headers=headers).json()
    again = save(headers, word=word)

    assert (saved["translation"], before[0]["translation"]) == (None, None)
    assert after == [{**saved, "translation": "chegou depois"}]
    assert (again.status_code, again.json()) == (200, after[0])


def test_save_rejects_invalid_input(make_user: MakeUser, fake_translate: Translate) -> None:
    _, headers = make_user()
    fake_translate("nunca")

    long_context = save(headers, word="house", context="x" * 301)
    invalid_word = save(headers, word="two words")
    missing_article = save(headers, word="house", article_id=999999999)

    assert long_context.status_code == 422
    assert invalid_word.status_code == 422
    assert missing_article.status_code == 404
    assert missing_article.json() == {"detail": "Texto não encontrado"}
    assert client.get("/vocabulary", headers=headers).json() == []


def test_list_shows_own_words_most_recent_first(
    make_user: MakeUser, fake_translate: Translate, word: str, article_id: int
) -> None:
    _, headers = make_user()
    _, other_headers = make_user()
    fake_translate("tradução")
    older = save(headers, word=word, article_id=article_id).json()
    newer = save(headers, word=f"{word}-b").json()
    save(other_headers, word=f"{word}-c")
    with Session(engine) as session:  # apaga também as linhas de cache das variações
        session.execute(delete(WordTranslation).where(WordTranslation.word.like(f"{word}-%")))
        session.commit()

    mine = client.get("/vocabulary", headers=headers)
    first_page = client.get("/vocabulary", params={"limit": 1}, headers=headers)

    assert mine.status_code == 200
    assert mine.json() == [newer, older]
    assert mine.json()[1]["article_title"].startswith("test-")
    assert first_page.json() == [newer]
    assert client.get("/vocabulary", params={"limit": 101}, headers=headers).status_code == 422


def test_delete_only_by_owner(make_user: MakeUser, fake_translate: Translate, word: str) -> None:
    _, headers = make_user()
    _, other_headers = make_user()
    fake_translate("tradução")
    word_id = save(headers, word=word).json()["id"]

    by_other = client.delete(f"/vocabulary/{word_id}", headers=other_headers)
    still_there = client.get("/vocabulary", headers=headers).json()
    by_owner = client.delete(f"/vocabulary/{word_id}", headers=headers)
    missing = client.delete(f"/vocabulary/{word_id}", headers=headers)

    assert by_other.status_code == 404
    assert by_other.json() == {"detail": "Palavra não encontrada"}
    assert [w["id"] for w in still_there] == [word_id]
    assert (by_owner.status_code, by_owner.content) == (204, b"")
    assert missing.status_code == 404
    assert missing.json() == by_other.json()
    assert client.get("/vocabulary", headers=headers).json() == []
