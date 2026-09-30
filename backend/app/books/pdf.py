from typing import BinaryIO, NamedTuple

from pypdf import PdfReader, apply_configuration, get_configuration

from app.articles.text import count_words
from app.gamification.xp import MIN_WORDS_FOR_COMPLETION_XP

MAX_PAGES = 1000
MAX_CHARS = 2_000_000  # texto extraído no total (proteção contra PDF-bomba)
# teto de descompressão por stream (o padrão do pypdf é 75 MB); passou → PDF recusado
MAX_STREAM_BYTES = 10_000_000
_STREAM_LIMITS = {
    name: MAX_STREAM_BYTES
    for name in (
        "zlib_maximum_output_length",
        "lzw_maximum_output_length",
        "run_length_maximum_output_length",
        "jbig2_maximum_output_length",
        "array_based_stream_maximum_output_length",
        "maximum_declared_stream_length",
    )
}
# capítulo do sumário menor que isso é juntado ao seguinte (sumário de itens minúsculos)
MIN_CHAPTER_WORDS = MIN_WORDS_FOR_COMPLETION_XP
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
        with apply_configuration(get_configuration().with_overwrites(**_STREAM_LIMITS)):
            return _extract(file)
    except PdfError:
        raise
    except Exception as e:  # o pypdf levanta tipos variados (corrompido, LimitReachedError)
        raise PdfError(UNREADABLE) from e


def _extract(file: BinaryIO) -> tuple[list[str], list[tuple[str, int]]]:
    reader = PdfReader(file)
    if reader.is_encrypted:
        raise PdfError(UNREADABLE)
    if len(reader.pages) > MAX_PAGES:
        raise PdfError(TOO_MANY_PAGES)
    pages: list[str] = []
    total = 0
    for page in reader.pages:
        # extract_text engole o erro de limite de descompressão (devolve ""); decodificar o
        # conteúdo antes faz o LimitReachedError subir e o PDF ser recusado
        contents = page.get_contents()
        if contents is not None:
            contents.get_data()
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


def _join(first: Chapter, second: Chapter) -> Chapter:
    return Chapter(
        first.title,
        f"{first.content}\n\n{second.content}",
        first.word_count + second.word_count,
    )


def _merge_small(chapters: list[Chapter]) -> list[Chapter]:
    """Capítulo com menos de MIN_CHAPTER_WORDS vai junto com o seguinte (o último, com o
    anterior), mantendo o título do primeiro da junção."""
    merged: list[Chapter] = []
    pending: Chapter | None = None
    for chapter in chapters:
        if pending is not None:
            chapter, pending = _join(pending, chapter), None
        if chapter.word_count < MIN_CHAPTER_WORDS:
            pending = chapter
        else:
            merged.append(chapter)
    if pending is not None:
        merged.append(_join(merged.pop(), pending) if merged else pending)
    return merged


def _pages_title(first: int, last: int) -> str:
    return f"Página {first + 1}" if first == last else f"Páginas {first + 1}–{last + 1}"


def build_chapters(pages: list[str], outline: list[tuple[str, int]]) -> list[Chapter]:
    """Um capítulo por item de 1º nível do sumário (os minúsculos juntados ao seguinte); sem
    sumário utilizável, seções de ~1.500 palavras cortadas na virada de página. Capítulos sem
    texto são removidos."""
    starts: list[tuple[str, int]] = []
    for title, page in sorted(outline, key=lambda item: item[1]):
        title = " ".join(title.split())[:MAX_TITLE_LENGTH]
        if title and 0 <= page < len(pages) and (not starts or page > starts[-1][1]):
            starts.append((title, page))

    chapters: list[Chapter | None] = []
    if len(starts) >= 2:  # um item só não divide nada
        # o que vem antes do primeiro item (capa, sumário) entra no primeiro capítulo
        bounds = [0] + [page for _, page in starts[1:]] + [len(pages)]
        for i, (title, _) in enumerate(starts):
            chapters.append(_chapter(title, pages[bounds[i] : bounds[i + 1]]))
        return _merge_small([chapter for chapter in chapters if chapter is not None])

    first = 0
    words = 0
    for index, text in enumerate(pages):
        words += count_words(text)
        if words >= SECTION_WORDS or index == len(pages) - 1:
            chapters.append(_chapter(_pages_title(first, index), pages[first : index + 1]))
            first, words = index + 1, 0
    return [chapter for chapter in chapters if chapter is not None]
