import re
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

from defusedxml.ElementTree import fromstring  # type: ignore[import-untyped]

from app.news import http
from app.news.attribution import VOA
from app.news.items import NewsItem, Skipped, join_paragraphs

# VOA Learning English: os feeds RSS (https://learningenglish.voanews.com/rssfeeds) trazem só
# título, link e data; o texto está na página do artigo, dentro de <div class="wsw">.
HOSTS = frozenset({"learningenglish.voanews.com"})
FEEDS = (
    "https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi",  # As It Is
    "https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm",  # Science & Technology
    "https://learningenglish.voanews.com/api/zmmpql-vomx-tpey-_q",  # Health & Lifestyle
    "https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym",  # Arts & Culture
)
MAX_FEED_BYTES = 1_000_000
MAX_PAGE_BYTES = 2_000_000

# Termos de uso da VOA: só o material produzido pela própria VOA é domínio público; texto de
# AP, Reuters e AFP não pode ser republicado. Qualquer menção descarta o item.
AGENCY = re.compile(r"\b(?:Associated Press|AP|Reuters|AFP|Agence France-Presse)\b")
# linha de créditos ("X wrote this story... Y adapted it.") fecha a matéria
_CREDIT = re.compile(
    r"wrote this story|adapted (?:it|this story)|reported this story|based on reporting"
    r"|contributed to this|for VOA Learning English",
    re.IGNORECASE,
)
_SIGN_OFF = re.compile(r"^I['’]m [A-Z][\w.' -]{1,40}\.?$")  # "I'm John Russell."
_RULE = re.compile(r"^_{3,}$")
# matéria em texto tem slug no caminho (/a/<slug>/<id>.html); /a/<id>.html é clipe de áudio
# ou vídeo sem texto, e nem é baixado
_ARTICLE_PATH = re.compile(r"^https://learningenglish\.voanews\.com/a/[^/]+/\d+\.html$")
_END_HEADINGS = ("quiz", "words in this story", "related", "practice")


class _ArticleParser(HTMLParser):
    """Parágrafos de <div class="wsw">, sem players de mídia, até as seções de exercício."""

    def __init__(self) -> None:
        super().__init__()
        self.paragraphs: list[str] = []
        self._depth = 0  # profundidade de <div> dentro do corpo (0 = fora)
        self._skip_depth = 0  # dentro de embed de mídia
        self._text: list[str] | None = None  # parágrafo ou título em curso
        self._done = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._done:
            return
        classes = (dict(attrs).get("class") or "").split()
        if tag == "div":
            if self._depth == 0:
                if "wsw" in classes:
                    self._depth = 1
                return
            self._depth += 1
            if not self._skip_depth and any(c.startswith("wsw__embed") for c in classes):
                self._skip_depth = self._depth
        elif self._depth and not self._skip_depth and tag in ("p", "h2", "h3"):
            self._text = []
        elif self._text is not None and tag == "br":
            self._text.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if self._done or not self._depth:
            return
        if tag == "div":
            if self._skip_depth == self._depth:
                self._skip_depth = 0
            self._depth -= 1
            if self._depth == 0:
                self._done = True  # fim do corpo
        elif tag in ("p", "h2", "h3") and self._text is not None:
            text = " ".join("".join(self._text).split())
            self._text = None
            if tag != "p":
                if text.lower().startswith(_END_HEADINGS):
                    self._done = True
                return  # intertítulos não entram no texto
            self.paragraphs.append(text)

    def handle_data(self, data: str) -> None:
        if self._text is not None:
            self._text.append(data)


def parse_feed(xml: bytes) -> list[tuple[str, str, str]]:
    """(título, link, pubDate) de cada <item>. defusedxml recusa DTD/entidades (XXE, bomba)."""
    root = fromstring(xml)
    return [
        (
            (item.findtext("title") or "").strip(),
            (item.findtext("link") or "").strip(),
            (item.findtext("pubDate") or "").strip(),
        )
        for item in root.iter("item")
    ]


def parse_article(html: str) -> tuple[str | None, str]:
    """(motivo de descarte ou None, texto limpo). Seções finais e créditos ficam de fora."""
    parser = _ArticleParser()
    parser.feed(html)
    body: list[str] = []
    for paragraph in parser.paragraphs:
        if not paragraph or _SIGN_OFF.match(paragraph):
            continue
        if _RULE.match(paragraph) or paragraph.lower().startswith("words in this story"):
            break
        if _CREDIT.search(paragraph):
            if AGENCY.search(paragraph):
                return "crédito de agência", ""
            break
        body.append(paragraph)
    text = join_paragraphs(body)
    if not text:
        return "página sem texto (áudio/vídeo)", ""
    if AGENCY.search(text):
        return "menção a agência no texto", ""
    return None, text


def fetch_items(limit: int) -> tuple[list[NewsItem], list[Skipped]]:
    """Os `limit` itens mais recentes dos feeds. Falha de um item não derruba os outros; falha
    de todos os feeds derruba a fonte (quem chama isola por fonte)."""
    entries: dict[str, tuple[str, str]] = {}
    skipped: list[Skipped] = []
    for feed in FEEDS:
        try:
            for title, link, date in parse_feed(http.get(feed, HOSTS, MAX_FEED_BYTES)):
                if _ARTICLE_PATH.match(link):
                    entries.setdefault(link, (title, date))
        except Exception as e:  # um feed quebrado não impede os outros
            skipped.append(Skipped(VOA, feed, f"feed com erro: {e}"))
    if not entries and skipped:
        raise http.FetchError("; ".join(f"{s.url}: {s.reason}" for s in skipped))

    dated = []
    for link, (title, date) in entries.items():
        try:
            published = parsedate_to_datetime(date)
        except (TypeError, ValueError):
            published = None
        dated.append((published, link, title))
    dated.sort(key=lambda entry: entry[0].timestamp() if entry[0] else 0, reverse=True)

    items: list[NewsItem] = []
    for published, link, title in dated[:limit]:
        try:
            # link fora da allowlist nem é requisitado (http.get recusa antes da rede)
            page = http.get(link, HOSTS, MAX_PAGE_BYTES).decode("utf-8", errors="replace")
            reason, text = parse_article(page)
        except Exception as e:
            skipped.append(Skipped(VOA, link, f"erro: {e}"))
            continue
        if reason:
            skipped.append(Skipped(VOA, link, reason))
        else:
            items.append(NewsItem(VOA, title, link, published, text))
    return items, skipped
