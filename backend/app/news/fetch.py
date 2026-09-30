import asyncio
import logging
import os
from collections.abc import Callable
from typing import NamedTuple

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.articles.text import count_words
from app.db import engine
from app.news import voa, wikinews
from app.news.attribution import VOA, WIKINEWS
from app.news.items import NewsItem, Skipped
from app.news.level import estimate_level

# mesmo logger do uvicorn: a busca periódica aparece no log do container
logger = logging.getLogger("uvicorn.error")

ITEMS_PER_SOURCE = 20  # itens mais recentes olhados por fonte a cada execução
MIN_WORDS, MAX_WORDS = 100, 3000
CATEGORY = "Notícias"

SOURCES: dict[str, Callable[[int], tuple[list[NewsItem], list[Skipped]]]] = {
    VOA: voa.fetch_items,
    WIKINEWS: wikinews.fetch_items,
}


class Report(NamedTuple):
    inserted: dict[str, int]
    skipped: list[Skipped]
    failed: dict[str, str]  # fonte que falhou inteira → erro


def _store(session: Session, item: NewsItem) -> bool:
    """Insere se o link é novo. UNIQUE em source_url deduplica, inclusive entre instâncias."""
    words = count_words(item.content)
    created = session.scalar(
        insert(Article)
        .values(
            title=item.title[:300],
            content=item.content,
            source=item.source,
            source_url=item.url,
            category=CATEGORY,
            difficulty=estimate_level(item.content),
            word_count=words,
            published_at=item.published_at,
        )
        .on_conflict_do_nothing(index_elements=[Article.source_url])
        .returning(Article.id)
    )
    return created is not None


def run() -> Report:
    """Busca as fontes uma vez. Falha de uma fonte ou de um item não derruba os outros."""
    report = Report({}, [], {})
    for name, fetch_items in SOURCES.items():
        report.inserted[name] = 0
        try:
            items, skipped = fetch_items(ITEMS_PER_SOURCE)
        except Exception as e:
            report.failed[name] = str(e)
            logger.warning("notícias: fonte %s falhou: %s", name, e)
            continue
        report.skipped.extend(skipped)
        with Session(engine) as session:
            for item in items:
                words = count_words(item.content)
                if not item.title or not MIN_WORDS <= words <= MAX_WORDS:
                    report.skipped.append(Skipped(name, item.url, f"{words} palavras"))
                elif _store(session, item):
                    report.inserted[name] += 1
            session.commit()
    logger.info("notícias: inseridas %s; descartadas %d", report.inserted, len(report.skipped))
    return report


def _run_logged() -> None:
    try:
        run()
    except Exception:
        logger.exception("notícias: busca falhou")


# ponytail: a busca periódica roda dentro da API (uma thread a cada N horas, sem fila). Com mais
# de uma instância cada uma busca, mas o UNIQUE em source_url impede duplicata. Job separado
# (cron/worker) quando a busca pesar ou precisar de monitoramento próprio.
def start_periodic(first_delay_seconds: float = 10) -> asyncio.Task[None] | None:
    """Agenda a busca a cada NEWS_FETCH_HOURS horas (padrão 6; 0 desliga)."""
    hours = float(os.environ.get("NEWS_FETCH_HOURS", "6"))
    if hours <= 0:
        return None

    async def loop() -> None:
        await asyncio.sleep(first_delay_seconds)
        while True:
            await asyncio.to_thread(_run_logged)  # fora do event loop
            await asyncio.sleep(hours * 3600)

    return asyncio.create_task(loop())


if __name__ == "__main__":
    report = run()
    for name, count in report.inserted.items():
        status = f"FALHOU ({report.failed[name]})" if name in report.failed else "ok"
        print(f"{name}: {count} inseridos [{status}]")
    for source, url, reason in report.skipped:
        print(f"  descartado ({source}): {reason} — {url}")
