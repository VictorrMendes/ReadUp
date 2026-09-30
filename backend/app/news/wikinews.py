import json
import re
from datetime import UTC, datetime
from urllib.parse import quote, urlencode

from app.news import http
from app.news.attribution import WIKINEWS
from app.news.items import NewsItem, Skipped, join_paragraphs

# Wikinews em inglês: API do MediaWiki. Lista pela categoria "Published" (mais recentes
# primeiro) e texto puro pelo TextExtracts (prop=extracts&explaintext). A Wikinews está em modo
# somente leitura desde 04/05/2026 (encerrada pela Wikimedia); o arquivo continua acessível.
HOSTS = frozenset({"en.wikinews.org"})
API = "https://en.wikinews.org/w/api.php"
ARTICLE_URL = "https://en.wikinews.org/wiki/"
MAX_BYTES = 1_000_000

# seções finais que não são a matéria
_END_SECTIONS = {
    "sources",
    "sister links",
    "related news",
    "external links",
    "see also",
    "references",
    "notes",
    "gallery",
}
_HEADING = re.compile(r"^=+\s*(.*?)\s*=+$")
_DATELINE = re.compile(r"^\w+day, (\w+ \d{1,2}, \d{4})$")  # "Friday, April 24, 2026"


def _api(params: dict[str, str]) -> dict[str, object]:
    query = urlencode({**params, "format": "json", "formatversion": "2"})
    data = json.loads(http.get(f"{API}?{query}", HOSTS, MAX_BYTES))
    if not isinstance(data, dict):
        raise ValueError("resposta inesperada da API")
    return data


def latest_titles(limit: int) -> list[str]:
    data = _api(
        {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Published",
            "cmtype": "page",
            "cmsort": "timestamp",
            "cmdir": "desc",
            "cmlimit": str(limit),
        }
    )
    members = data["query"]["categorymembers"]  # type: ignore[index]
    return [str(member["title"]) for member in members]


def parse_extract(extract: str) -> tuple[datetime | None, str]:
    """(data da linha de data, texto limpo) a partir do extrato em texto puro com títulos
    no formato wiki (== Seção ==). Corta nas seções finais (fontes, links)."""
    published = None
    paragraphs: list[str] = []
    for line in extract.splitlines():
        line = line.strip()
        if not line:
            continue
        heading = _HEADING.match(line)
        if heading:
            if heading.group(1).lower() in _END_SECTIONS:
                break
            continue  # intertítulo do corpo: fora do texto
        dateline = _DATELINE.match(line)
        if dateline and not paragraphs and published is None:
            published = datetime.strptime(dateline.group(1), "%B %d, %Y").replace(tzinfo=UTC)
            continue
        paragraphs.append(line)
    return published, join_paragraphs(paragraphs)


def fetch_items(limit: int) -> tuple[list[NewsItem], list[Skipped]]:
    items: list[NewsItem] = []
    skipped: list[Skipped] = []
    for title in latest_titles(limit):
        url = ARTICLE_URL + quote(title.replace(" ", "_"))
        try:
            data = _api(
                {
                    "action": "query",
                    "prop": "extracts",
                    "explaintext": "1",
                    "exsectionformat": "wiki",
                    "titles": title,
                }
            )
            extract = str(data["query"]["pages"][0].get("extract", ""))  # type: ignore[index]
            published, text = parse_extract(extract)
        except Exception as e:  # um item quebrado não derruba os outros
            skipped.append(Skipped(WIKINEWS, url, f"erro: {e}"))
            continue
        items.append(NewsItem(WIKINEWS, title, url, published, text))
    return items, skipped
