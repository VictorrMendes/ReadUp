import asyncio
import json
import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.request import Request

import pytest
from defusedxml import DefusedXmlException  # type: ignore[import-untyped]
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.articles.seed import SEED_FILE
from app.db import engine
from app.news import fetch, http, voa, wikinews
from app.news.attribution import VOA, WIKINEWS, attribution
from app.news.level import estimate_level
from tests.conftest import MakeUser, client

FIXTURES = Path(__file__).parent / "fixtures" / "news"
WRIGHT = "wilbur-and-orville-wright-the-first-airplane"
ECLIPSE = "total-lunar-eclipse-to-turn-moon-red"


def fixture(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


# --- respostas simuladas (respostas reais reduzidas em tests/fixtures/news; sem rede) ---


class FakeResponse:
    def __init__(self, body: bytes) -> None:
        self.body = body

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        pass

    def read(self, size: int) -> bytes:
        return self.body[:size]


Routes = dict[str, bytes | Exception]


class FakeOpener:
    """Responde pela primeira chave contida na URL; registra tudo o que foi pedido."""

    def __init__(self, routes: Routes) -> None:
        self.routes = routes
        self.requested: list[str] = []

    def open(self, request: Request, timeout: float) -> FakeResponse:
        url = request.full_url
        self.requested.append(url)
        assert timeout == http.TIMEOUT_SECONDS
        assert request.get_header("User-agent", "").startswith("ReadUp/")
        for key, result in self.routes.items():
            if key in url:
                if isinstance(result, Exception):
                    raise result
                return FakeResponse(result)
        raise AssertionError(f"URL inesperada: {url}")


@pytest.fixture
def run_id() -> Iterator[str]:
    """Deixa os links das fixtures únicos por teste e apaga os artigos criados com eles."""
    value = uuid.uuid4().hex[:10]
    yield value
    with Session(engine) as session:
        session.execute(delete(Article).where(Article.source_url.contains(value)))
        session.commit()


def real_routes(run_id: str) -> Routes:
    feed = fixture("voa_feed.xml").replace(WRIGHT.encode(), f"{WRIGHT}-{run_id}".encode())
    feed = feed.replace(ECLIPSE.encode(), f"{ECLIPSE}-{run_id}".encode())
    return {
        "learningenglish.voanews.com/api/": feed,
        f"{WRIGHT}-{run_id}": fixture("voa_article.html"),
        f"{ECLIPSE}-{run_id}": fixture("voa_article_agency.html"),
        "list=categorymembers": fixture("wikinews_list.json"),
        "titles=Pope": fixture("wikinews_pope.json"),
        "titles=Boats": fixture("wikinews_boats.json"),
    }


Install = Callable[[Routes], FakeOpener]


@pytest.fixture
def fake_web(monkeypatch: pytest.MonkeyPatch, run_id: str) -> Install:
    monkeypatch.setattr(http, "DEFAULT_INTERVAL_SECONDS", 0.0)
    monkeypatch.setattr(http, "INTERVAL_SECONDS", {})
    monkeypatch.setattr(wikinews, "ARTICLE_URL", f"https://en.wikinews.org/wiki/{run_id}/")

    def install(routes: Routes) -> FakeOpener:
        opener = FakeOpener(routes)
        monkeypatch.setattr(http, "_opener", opener)
        return opener

    return install


# --- VOA ---


def test_voa_feed_lists_title_link_and_date() -> None:
    entries = voa.parse_feed(fixture("voa_feed.xml"))

    assert len(entries) == 4
    title, link, date = next(e for e in entries if WRIGHT in e[1] and "evil" not in e[1])
    assert title == "Wilbur and Orville Wright: The First Airplane"
    assert link == f"https://learningenglish.voanews.com/a/{WRIGHT}/7998765.html"
    assert date == "Mon, 17 Mar 2025 22:05:00 +0000"


def test_voa_article_is_clean_text_without_final_sections() -> None:
    reason, text = voa.parse_article(fixture("voa_article.html").decode())

    assert reason is None
    paragraphs = text.split("\n\n")
    assert paragraphs[0].startswith("Wilbur and Orville Wright are the American inventors")
    assert paragraphs[-1].endswith("over one hundred years ago.")
    assert len(paragraphs) == 12
    for leftover in (
        "No media source",
        "I’m John Russell",
        "wrote this story",
        "Quiz",
        "Words in This Story",
        "a flying object similar to an airplane",  # definição de "Words in This Story"
        "<",
        "&amp;",
    ):
        assert leftover not in text


def test_voa_article_credited_to_an_agency_is_discarded() -> None:
    reason, text = voa.parse_article(fixture("voa_article_agency.html").decode())

    assert (reason, text) == ("crédito de agência", "")


@pytest.mark.parametrize(
    "paragraph",
    [
        "Dan Novak adapted this story for VOA Learning English based on reporting by Reuters.",
        "The information came from AFP and other sources.",
        "Scientists told the Associated Press the results were clear.",
    ],
)
def test_voa_any_agency_mention_discards_the_item(paragraph: str) -> None:
    html = (
        '<div class="wsw"><p>A long enough first paragraph about science.</p>'
        f"<p>{paragraph}</p></div>"
    )
    reason, _ = voa.parse_article(html)
    assert reason in ("crédito de agência", "menção a agência no texto")


def test_voa_fetch_keeps_own_text_and_skips_agency_audio_and_other_hosts(
    fake_web: Install, run_id: str
) -> None:
    opener = fake_web(real_routes(run_id))

    items, skipped = voa.fetch_items(20)

    assert [(i.source, i.title) for i in items] == [
        (VOA, "Wilbur and Orville Wright: The First Airplane")
    ]
    assert items[0].published_at == datetime(2025, 3, 17, 22, 5, tzinfo=UTC)
    assert [(s.reason, ECLIPSE in s.url) for s in skipped] == [("crédito de agência", True)]
    # nem o link de outro host nem o clipe de áudio (/a/<id>.html) foram requisitados
    assert not any("evil.example.com" in url for url in opener.requested)
    assert not any(url.endswith("/a/8010810.html") for url in opener.requested)


# --- Wikinews ---


def test_wikinews_extract_to_clean_text() -> None:
    data = json.loads(fixture("wikinews_pope.json"))
    extract = data["query"]["pages"][0]["extract"]

    published, text = wikinews.parse_extract(extract)

    assert published == datetime(2026, 4, 24, tzinfo=UTC)
    paragraphs = text.split("\n\n")
    assert paragraphs[0].startswith("Pope Leo XIV arrived by plane in Algeria")
    assert paragraphs[-1].endswith("before his scheduled return to the Vatican.")
    assert "Sources" not in text and "Sister links" not in text and "Friday, April" not in text


def test_wikinews_fetch_lists_latest_and_reads_each(fake_web: Install, run_id: str) -> None:
    opener = fake_web(real_routes(run_id))

    items, skipped = wikinews.fetch_items(20)

    assert skipped == []
    assert [i.title for i in items] == [
        "Pope Leo XIV visits four nations in Africa",
        "Boats carrying Kyoto students capsize off Okinawa, fatalities reported",
    ]
    assert items[0].url.startswith(f"https://en.wikinews.org/wiki/{run_id}/Pope_Leo_XIV")
    assert all(url.startswith("https://en.wikinews.org/w/api.php?") for url in opener.requested)


# --- busca HTTP: allowlist, XML seguro, limites ---


def test_link_outside_allowlist_is_refused_without_request(fake_web: Install) -> None:
    opener = fake_web({})

    for url in (
        "https://evil.example.com/a/x/1.html",
        "http://learningenglish.voanews.com/a/x/1.html",  # só HTTPS
        "https://169.254.169.254/latest/meta-data",
    ):
        with pytest.raises(http.FetchError, match="allowlist"):
            http.get(url, voa.HOSTS, 1000)
    assert opener.requested == []


@pytest.mark.parametrize(
    "xml",
    [
        pytest.param(
            b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>'
            b"<rss><channel><item><title>&x;</title></item></channel></rss>",
            id="entidade externa (XXE)",
        ),
        pytest.param(
            b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaaaaaaaa">'
            b'<!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;">]>'
            b"<rss><channel><item><title>&c;</title></item></channel></rss>",
            id="expansão de entidades",
        ),
    ],
)
def test_malicious_xml_is_rejected(xml: bytes) -> None:
    with pytest.raises(DefusedXmlException):
        voa.parse_feed(xml)


def test_response_over_limit_and_timeout_are_fetch_errors(fake_web: Install) -> None:
    fake_web({"big": b"x" * 101, "slow": TimeoutError("timed out")})

    with pytest.raises(http.FetchError, match="maior que 100 bytes"):
        http.get("https://learningenglish.voanews.com/big", voa.HOSTS, 100)
    with pytest.raises(http.FetchError, match="timed out"):
        http.get("https://learningenglish.voanews.com/slow", voa.HOSTS, 100)


@pytest.mark.parametrize(
    "voa_failure",
    [
        pytest.param(TimeoutError("timed out"), id="timeout"),
        pytest.param(b"x" * (voa.MAX_FEED_BYTES + 1), id="feed grande demais"),
        pytest.param(b'<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>', id="XXE"),
    ],
)
def test_failing_source_is_isolated(
    fake_web: Install, run_id: str, voa_failure: bytes | Exception
) -> None:
    fake_web({**real_routes(run_id), "learningenglish.voanews.com/api/": voa_failure})

    report = fetch.run()

    assert VOA in report.failed
    assert report.inserted == {VOA: 0, WIKINEWS: 2}


# --- gravação ---


def test_fetch_twice_does_not_duplicate(fake_web: Install, run_id: str) -> None:
    fake_web(real_routes(run_id))

    first = fetch.run()
    second = fetch.run()

    assert first.inserted == {VOA: 1, WIKINEWS: 2}
    assert second.inserted == {VOA: 0, WIKINEWS: 0}
    assert first.failed == second.failed == {}
    with Session(engine) as session:
        rows = session.scalars(select(Article).where(Article.source_url.contains(run_id))).all()
        assert session.scalar(select(func.count()).where(Article.source_url.contains(run_id))) == 3
    wright = next(a for a in rows if a.source == VOA)
    assert (wright.category, wright.book_id, wright.difficulty) == ("Notícias", None, "B1")
    assert wright.word_count == 447
    assert wright.published_at == datetime(2025, 3, 17, 22, 5, tzinfo=UTC)
    assert "\n\n" in wright.content


def test_items_outside_word_bounds_are_skipped(
    fake_web: Install, run_id: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_web(real_routes(run_id))
    monkeypatch.setattr(fetch, "MIN_WORDS", 200)  # a notícia de 112 palavras sai

    report = fetch.run()

    assert report.inserted == {VOA: 1, WIKINEWS: 1}
    assert ("Wikinews", "112 palavras") in {(s.source, s.reason) for s in report.skipped}


# --- nível e atribuição ---


def test_estimate_level_against_hand_labelled_seed_texts() -> None:
    seed = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    estimated = {a["title"]: (a["level"], estimate_level(a["content"])) for a in seed}

    for title, (labelled, level) in estimated.items():
        if labelled in ("A1", "A2"):
            assert level in ("A1", "A2"), title
        if labelled in ("C1",):
            assert level in ("B2", "C1"), title
    assert sum(labelled == level for labelled, level in estimated.values()) >= 9


@pytest.mark.parametrize(
    ("source", "published_at", "expected"),
    [
        (VOA, None, "Fonte: VOA Learning English (domínio público)"),
        (
            WIKINEWS,
            datetime(2026, 4, 24, tzinfo=UTC),
            "Fonte: Wikinews · CC BY 4.0 (creativecommons.org/licenses/by/4.0) · texto adaptado",
        ),
        (
            WIKINEWS,
            datetime(2015, 1, 1, tzinfo=UTC),
            "Fonte: Wikinews · CC BY 2.5 (creativecommons.org/licenses/by/2.5) · texto adaptado",
        ),
        (
            WIKINEWS,
            datetime(2005, 1, 1, tzinfo=UTC),
            "Fonte: Wikinews · domínio público · texto adaptado",
        ),
        ("ReadUp", None, None),
        ("pdf", None, None),
    ],
)
def test_attribution(source: str, published_at: datetime | None, expected: str | None) -> None:
    assert attribution(source, published_at) == expected


def test_article_detail_has_attribution_and_original_link(
    make_user: MakeUser, article_id: int, run_id: str
) -> None:
    _, headers = make_user()
    url = f"https://en.wikinews.org/wiki/{run_id}"
    with Session(engine) as session:
        news = Article(
            title="News",
            content="word " * 150,
            source=WIKINEWS,
            source_url=url,
            category="Notícias",
            difficulty="B1",
            word_count=150,
            published_at=datetime(2026, 4, 24, tzinfo=UTC),
        )
        session.add(news)
        session.commit()
        news_id = news.id

    detail: Any = client.get(f"/articles/{news_id}", headers=headers).json()
    app_text: Any = client.get(f"/articles/{article_id}", headers=headers).json()
    feed = {a["id"]: a for a in client.get("/articles?limit=50", headers=headers).json()}

    assert detail["attribution"].startswith("Fonte: Wikinews · CC BY 4.0")
    assert detail["source_url"] == url
    assert (app_text["attribution"], app_text["source_url"]) == (None, None)
    assert feed[news_id]["category"] == "Notícias"


# --- execução periódica ---


def test_periodic_fetch_is_off_with_zero_hours(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NEWS_FETCH_HOURS", "0")
    assert fetch.start_periodic() is None


def test_periodic_fetch_runs_in_a_thread_after_the_first_delay(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("NEWS_FETCH_HOURS", "6")
    calls: list[str] = []
    monkeypatch.setattr(fetch, "_run_logged", lambda: calls.append("run"))

    async def scenario() -> None:
        task = fetch.start_periodic(first_delay_seconds=0)
        assert task is not None
        await asyncio.sleep(0.2)
        task.cancel()

    asyncio.run(scenario())
    assert calls == ["run"]  # uma vez; a próxima só depois de 6 h
