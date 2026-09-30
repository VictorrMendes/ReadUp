from datetime import datetime
from typing import NamedTuple


class NewsItem(NamedTuple):
    source: str
    title: str
    url: str
    published_at: datetime | None
    content: str  # só texto; parágrafos separados por linha em branco (formato do leitor)


class Skipped(NamedTuple):
    """Item descartado (vai para o relatório da execução)."""

    source: str
    url: str
    reason: str


def join_paragraphs(paragraphs: list[str]) -> str:
    """Espaços colapsados em cada parágrafo, vazios removidos, separados por linha em branco."""
    return "\n\n".join(filter(None, (" ".join(p.split()) for p in paragraphs)))
