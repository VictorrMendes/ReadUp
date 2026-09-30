from typing import BinaryIO, NamedTuple

from pypdf import PdfReader

from app.articles.text import count_words

MAX_PAGES = 1000
MAX_CHARS = 2_000_000  # texto extraído no total (proteção contra PDF-bomba)
SECTION_WORDS = 1500
MAX_TITLE_LENGTH = 200

UNREADABLE = "Não foi possível ler este PDF"
TOO_MANY_PAGES = f"PDF com mais de {MAX_PAGES} páginas não é suportado"
TOO_MUCH_TEXT = "PDF com texto demais para importar"

# fim de frase: linha curta terminando assim fecha o parágrafo
_PARAGRAPH_END = tuple('.!?:"”’)')


class PdfError(ValueError):
    """PDF recusado; a mensagem vai para o usuário."""


class Chapter(NamedTuple):
    title: str
    content: str
    word_count: int


def extract(file: BinaryIO) -> tuple[list[str], list[tuple[str, int]]]:
    """(texto de cada página, sumário de 1º nível como (título, índice da página inicial))."""
    try:
        reader = PdfReader(file)
        if reader.is_encrypted:
            raise PdfError(UNREADABLE)
        if len(reader.pages) > MAX_PAGES:
            raise PdfError(TOO_MANY_PAGES)
        pages: list[str] = []
        total = 0
        for page in reader.pages:
            text = page.extract_text() or ""
            total += len(text)
            if total > MAX_CHARS:
                raise PdfError(TOO_MUCH_TEXT)
            pages.append(text)
        outline: list[tuple[str, int]] = []
        for item in reader.outline:
            if isinstance(item, list):  # listas são os subitens (2º nível)
                continue
            page_number = reader.get_destination_page_number(item)
            if page_number is not None:  # destino quebrado: ignora o item
                outline.append((str(item.title), page_number))
    except PdfError:
        raise
    except Exception as e:  # o pypdf levanta tipos variados para arquivo corrompido
        raise PdfError(UNREADABLE) from e
    return pages, outline


def clean(text: str) -> str:
    """Texto de uma página no formato do leitor: parágrafos separados por linha em branco, com as
    quebras de linha internas juntadas e a hifenização de fim de linha desfeita."""
    lines = [line.strip() for line in text.splitlines()]
    width = max((len(line) for line in lines), default=0)
    paragraphs: list[str] = []
    current: list[str] = []

    def flush() -> None:
        if current:
            paragraphs.append(" ".join(current))
            current.clear()

    for line in lines:
        if not line:
            flush()
            continue
        # "infor-" + "mation" → "information"
        # ponytail: junta também hífen real quebrado no fim da linha ("well-" + "known")
        if current and current[-1].endswith("-") and line[0].islower():
            current[-1] = current[-1][:-1] + line
        else:
            current.append(line)
        # ponytail: parágrafo = linha curta que termina frase; PDFs sem esse padrão viram
        # parágrafos longos (ainda legíveis)
        if current[-1].endswith(_PARAGRAPH_END) and len(line) < width * 0.8:
            flush()
    flush()
    return "\n\n".join(paragraphs)


def _chapter(title: str, pages: list[str]) -> Chapter | None:
    content = "\n\n".join(filter(None, (clean(page) for page in pages)))
    words = count_words(content)
    return Chapter(title, content, words) if words else None


def _pages_title(first: int, last: int) -> str:
    return f"Página {first + 1}" if first == last else f"Páginas {first + 1}–{last + 1}"


def build_chapters(pages: list[str], outline: list[tuple[str, int]]) -> list[Chapter]:
    """Um capítulo por item de 1º nível do sumário; sem sumário utilizável, seções de ~1.500
    palavras cortadas na virada de página. Capítulos sem texto são removidos."""
    starts: list[tuple[str, int]] = []
    for title, page in sorted(outline, key=lambda item: item[1]):
        title = " ".join(title.split())[:MAX_TITLE_LENGTH]
        if title and 0 <= page < len(pages) and (not starts or page > starts[-1][1]):
            starts.append((title, page))

    chapters: list[Chapter | None] = []
    if len(starts) >= 2:  # um item só não divide nada
        # o que vem antes do primeiro item (capa, sumário) entra no primeiro capítulo
        bounds = [0] + [page for _, page in starts[1:]] + [len(pages)]
        chapters = [
            _chapter(title, pages[bounds[i] : bounds[i + 1]]) for i, (title, _) in enumerate(starts)
        ]
    else:
        first = 0
        words = 0
        for index, text in enumerate(pages):
            words += count_words(text)
            if words >= SECTION_WORDS or index == len(pages) - 1:
                chapters.append(_chapter(_pages_title(first, index), pages[first : index + 1]))
                first, words = index + 1, 0
    return [chapter for chapter in chapters if chapter is not None]
