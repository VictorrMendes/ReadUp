import io
import math
import re
from typing import Any, BinaryIO, NamedTuple

import pypdfium2 as pdfium
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
# seção menor que isso vai junto com a seguinte (página de abertura, epígrafe, item minúsculo)
MIN_CHAPTER_WORDS = MIN_WORDS_FOR_COMPLETION_XP
# capítulo longo vira partes: uma sessão de leitura de 10–20 min, e o leitor do celular não
# precisa montar milhares de palavras de uma vez
MAX_PART_WORDS = 3000
PART_WORDS = 2500
# texto antes do 1º capítulo do sumário: abaixo disso é folha de rosto, direitos, sumário ou
# trecho de divulgação (não entra); acima, é leitura sem marcador (prólogo) e vai no 1º capítulo
FRONT_MATTER_WORDS = 800
# sem sumário nem títulos de capítulo reconhecíveis: seções de ~1.500 palavras
SECTION_WORDS = 1500
MAX_TITLE_LENGTH = 200
OUTLINE_DEPTH = 2  # 1º e 2º nível do sumário (partes e capítulos); o 3º é miúdo demais

UNREADABLE = "Não foi possível ler este PDF"
TOO_MANY_PAGES = f"PDF com mais de {MAX_PAGES} páginas não é suportado"
TOO_MUCH_TEXT = "PDF com texto demais para importar"

# fim de frase: linha curta terminando assim fecha o parágrafo
_PARAGRAPH_END = tuple('.!?:"”’)')
# marcas de hifenização que o PDFium deixa no meio da palavra ("hap￾pening")
_HYPHEN_MARKS = str.maketrans("", "", "￾­\x02")
# itens do sumário que não são leitura (capa, direitos, "sobre o autor", prévia de outro livro):
# só saem nas pontas do livro, antes do 1º e depois do último capítulo
_NOT_CONTENT = re.compile(
    r"\b(cover|capa|contracapa|front ?leaf|rear ?leaf|end ?papers?|copyright|direitos|"
    r"contents|sum[aá]rio|[ií]ndice|index|title ?page|folha de rosto|half ?title|"
    r"dedica\w*|acknowledg\w*|agradecimentos?|also by|tamb[eé]m d[eo]|about the author|"
    r"sobre o autor|meet the author|corrections|errata|preview|excerpt|extras|"
    r"newsletter|praise for|colophon|cr[eé]ditos)\b",
    re.IGNORECASE,
)
# título de capítulo no texto (PDF sem sumário): "CHAPTER ONE", "— Chapter 3 —", "Capítulo IV"
_HEADING = re.compile(
    r"^[\W_]*(chapter|cap[ií]tulo|part|parte|prologue|pr[oó]logo|epilogue|ep[ií]logo)"
    r"\b[\w\s.:–—-]{0,40}$",
    re.IGNORECASE,
)
# linha que é só marcador: número de seção ("II", "3") ou separador ("*", "•")
_ORNAMENT = re.compile(r"^[\W_]*([ivxlc]{1,6}|\d{1,3}|[*•·]+)?[\W_]*$", re.IGNORECASE)
_SMALL_WORDS = frozenset("a an and as at but by for from in into nor of on or the to with".split())


class PdfError(ValueError):
    """PDF recusado; a mensagem vai para o usuário."""


class OutlineItem(NamedTuple):
    title: str
    page: int  # índice da página (0 = primeira)
    depth: int = 0  # 0 = 1º nível do sumário


class Chapter(NamedTuple):
    title: str
    content: str
    word_count: int


def extract(file: BinaryIO) -> tuple[list[str], list[OutlineItem]]:
    """(texto de cada página, sumário de 1º e 2º nível).

    O pypdf valida o arquivo (senha, páginas, limites de descompressão contra PDF-bomba) e lê o
    sumário; o texto vem do PDFium, que separa as palavras certo onde o pypdf as quebra
    ("Durs ley", "hap pening") e é bem mais rápido."""
    data = file.read()
    try:
        with apply_configuration(get_configuration().with_overwrites(**_STREAM_LIMITS)):
            outline = _validate_and_outline(data)
        return _text_pages(data), outline
    except PdfError:
        raise
    except Exception as e:  # pypdf e PDFium levantam tipos variados (corrompido, limite)
        raise PdfError(UNREADABLE) from e


def _validate_and_outline(data: bytes) -> list[OutlineItem]:
    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        raise PdfError(UNREADABLE)
    if len(reader.pages) > MAX_PAGES:
        raise PdfError(TOO_MANY_PAGES)
    for page in reader.pages:
        # decodifica o conteúdo de cada página: passou do limite → LimitReachedError → recusado
        contents = page.get_contents()
        if contents is not None:
            contents.get_data()

    items: list[OutlineItem] = []

    def walk(entries: list[Any], depth: int) -> None:
        for entry in entries:
            if isinstance(entry, list):  # lista = subitens do item anterior
                if depth + 1 < OUTLINE_DEPTH:
                    walk(entry, depth + 1)
                continue
            page_number = reader.get_destination_page_number(entry)
            if page_number is not None:  # destino quebrado: ignora o item
                items.append(OutlineItem(str(entry.title), page_number, depth))

    walk(reader.outline, 0)
    return items


def _text_pages(data: bytes) -> list[str]:
    document = pdfium.PdfDocument(data)
    try:
        pages: list[str] = []
        total = 0
        for index in range(len(document)):
            page = document[index]
            textpage = page.get_textpage()
            try:
                text = textpage.get_text_range()
            finally:
                textpage.close()
                page.close()
            text = text.replace("\r\n", "\n").replace("\r", "\n").translate(_HYPHEN_MARKS)
            total += len(text)
            if total > MAX_CHARS:
                raise PdfError(TOO_MUCH_TEXT)
            pages.append(text)
        return pages
    finally:
        document.close()


def strip_running_lines(pages: list[str]) -> list[str]:
    """Tira cabeçalho e rodapé: número de página sozinho e linhas com número que se repetem nas
    bordas de várias páginas ("8 Harry Potter", "Diagon Alley 51"). Não fazem parte da leitura."""

    def norm(line: str) -> str:
        return re.sub(r"\d+", "#", " ".join(line.split()).lower())

    split = [page.split("\n") for page in pages]
    counts: dict[str, int] = {}
    for lines in split:
        filled = [line for line in lines if line.strip()]
        for line in set(filled[:2] + filled[-2:]):
            key = norm(line)
            counts[key] = counts.get(key, 0) + 1
    running = {key for key, n in counts.items() if n >= 3 and "#" in key and len(key) < 80}

    result: list[str] = []
    for lines in split:
        indexes = [i for i, line in enumerate(lines) if line.strip()]
        drop: set[int] = set()
        for edge in (indexes[:2], indexes[::-1][:2]):
            for i in edge:  # de fora para dentro; para na primeira linha que é texto
                key = norm(lines[i])
                if key != "#" and key not in running:
                    break
                drop.add(i)
        result.append("\n".join(line for i, line in enumerate(lines) if i not in drop))
    return result


def clean(text: str) -> str:
    """Texto no formato do leitor: parágrafos separados por linha em branco, com as quebras de
    linha internas juntadas, a hifenização de fim de linha desfeita e marcadores de seção ("II",
    "*") em parágrafo próprio."""
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
        if _ORNAMENT.match(line):  # marcador de seção ("II", "*"): parágrafo próprio
            flush()
            paragraphs.append(line)
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


def title_case(raw: str) -> str:
    """Título limpo: espaços normalizados e CAIXA ALTA em Title Case ("THE VOICE OF REASON" →
    "The Voice of Reason"); títulos em caixa mista ficam como estão."""
    title = " ".join(raw.split())
    if any(c.isalpha() for c in title) and title == title.upper():
        words: list[str] = []
        for word in title.lower().split(" "):
            # palavra pequena fica minúscula, menos no começo ("1: The Voice", "Part Two: The")
            opening = not any(c.isalpha() for c in " ".join(words)) or words[-1].endswith(":")
            words.append(
                word if word in _SMALL_WORDS and not opening else word[:1].upper() + word[1:]
            )
        title = " ".join(words)
    return title[:MAX_TITLE_LENGTH]


class _Start(NamedTuple):
    title: str
    page: int
    offset: int = 0  # posição no texto da página (capítulo que começa no meio da página)


def _offset_in_page(text: str, title: str) -> int:
    """Onde o título do capítulo aparece na página; 0 se não achar ou se já está no topo."""
    wanted = re.sub(r"\W+", " ", title).strip().lower()
    if len(wanted) < 4:
        return 0
    position = 0
    for number, line in enumerate(text.split("\n")):
        found = re.sub(r"\W+", " ", line).strip().lower()
        if found and (found.startswith(wanted) or (len(found) > 8 and wanted.startswith(found))):
            return 0 if number < 3 else position
        position += len(line) + 1
    return 0


def _sections(pages: list[str], starts: list[_Start], end: int) -> list[Chapter]:
    """Texto de cada seção, de um começo até o seguinte (ou até a página `end`, exclusiva)."""
    chapters: list[Chapter] = []
    for i, start in enumerate(starts):
        stop = starts[i + 1] if i + 1 < len(starts) else _Start("", end)
        last = stop.page if stop.offset else stop.page - 1
        parts: list[str] = []
        for page in range(start.page, min(last, len(pages) - 1) + 1):
            text = pages[page]
            high = stop.offset if page == stop.page and stop.offset else len(text)
            low = start.offset if page == start.page else 0
            parts.append(text[low:high])
        # páginas juntas antes de limpar: o parágrafo que continua na página seguinte não quebra
        content = clean(_drop_heading("\n".join(parts), start.title))
        words = count_words(content)
        if words:
            chapters.append(Chapter(start.title, content, words))
    return chapters


def _drop_heading(text: str, title: str) -> str:
    """Tira do começo da seção as linhas do título, que o leitor já mostra: "— CHAPTER ONE —",
    "The Boy Who Lived", "THE WITCHER", número da seção ("1", "I")."""
    wanted = re.sub(r"\W+", " ", title).strip().lower()
    lines = text.split("\n")
    removed = 0
    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        found = re.sub(r"\W+", " ", stripped).strip().lower()
        heading = (
            _HEADING.match(stripped)
            or _ORNAMENT.match(stripped)
            or (len(found) > 2 and (found in wanted or wanted in found) and len(stripped) < 80)
        )
        if not heading or removed == 4:
            return "\n".join(lines[index:])
        removed += 1
    return ""


def _join(first: Chapter, second: Chapter, title: str) -> Chapter:
    return Chapter(
        title, f"{first.content}\n\n{second.content}", first.word_count + second.word_count
    )


def _merge_small(chapters: list[Chapter]) -> list[Chapter]:
    """Seção com menos de MIN_CHAPTER_WORDS vai junto com a seguinte, que dá o título (a pequena
    costuma ser página de abertura ou epígrafe); a última pequena vai para a anterior."""
    merged: list[Chapter] = []
    pending: Chapter | None = None
    for chapter in chapters:
        if pending is not None:
            chapter, pending = _join(pending, chapter, chapter.title), None
        if chapter.word_count < MIN_CHAPTER_WORDS:
            pending = chapter
        else:
            merged.append(chapter)
    if pending is not None:
        if merged:
            previous = merged.pop()
            merged.append(_join(previous, pending, previous.title))
        else:
            merged.append(pending)
    return merged


def _split_long(chapter: Chapter) -> list[Chapter]:
    """Capítulo com mais de MAX_PART_WORDS vira partes parecidas, cortadas entre parágrafos:
    "Diagon Alley (1/3)". Parágrafo gigante (PDF sem quebras) não é cortado no meio."""
    if chapter.word_count <= MAX_PART_WORDS:
        return [chapter]
    count = math.ceil(chapter.word_count / PART_WORDS)
    target = chapter.word_count / count
    groups: list[list[str]] = [[]]
    words = 0
    for paragraph in chapter.content.split("\n\n"):
        if groups[-1] and len(groups) < count and words >= target * len(groups):
            groups.append([])
        groups[-1].append(paragraph)
        words += count_words(paragraph)
    if len(groups) == 1:
        return [chapter]
    texts = ["\n\n".join(group) for group in groups]
    return [
        Chapter(f"{chapter.title} ({i}/{len(texts)})"[:MAX_TITLE_LENGTH], text, count_words(text))
        for i, text in enumerate(texts, start=1)
    ]


def _finish(chapters: list[Chapter]) -> list[Chapter]:
    return [part for chapter in _merge_small(chapters) for part in _split_long(chapter)]


def _outline_starts(pages: list[str], outline: list[OutlineItem]) -> tuple[list[_Start], int]:
    """Começos de seção pelo sumário, sem capa/direitos e afins nas pontas, e a página onde a
    leitura acaba (antes de "sobre o autor", prévias etc.)."""
    items = [
        item._replace(title=title_case(item.title))
        for item in sorted(outline, key=lambda item: (item.page, item.depth))
        if 0 <= item.page < len(pages) and item.title.strip()
    ]
    content = [i for i, item in enumerate(items) if not _NOT_CONTENT.search(item.title)]
    if not content:
        return [], len(pages)
    first, last = content[0], content[-1]
    end = items[last + 1].page if last + 1 < len(items) else len(pages)

    starts: list[_Start] = []
    for item in items[first : last + 1]:
        start = _Start(item.title, item.page, _offset_in_page(pages[item.page], item.title))
        if starts and (starts[-1].page, starts[-1].offset) >= (start.page, start.offset):
            if (starts[-1].page, starts[-1].offset) == (start.page, start.offset):
                starts[-1] = start  # mesmo ponto: fica o item mais específico
            continue
        starts.append(start)
    before = sum(count_words(text) for text in pages[: starts[0].page]) if starts else 0
    if starts and first == 0 and before >= FRONT_MATTER_WORDS:
        # leitura antes do 1º item sem marcador no sumário (prólogo): entra no 1º capítulo
        starts[0] = starts[0]._replace(page=0, offset=0)
    return starts, max(end, starts[-1].page + 1) if starts else end


def _heading_starts(pages: list[str]) -> list[_Start]:
    """PDF sem sumário: página que começa com "Chapter …"/"Capítulo …" abre seção; a linha curta
    logo abaixo, se houver, entra no título ("Chapter One · The Boy Who Lived")."""
    starts: list[_Start] = []
    for index, text in enumerate(pages):
        lines = [line.strip() for line in text.split("\n") if line.strip()][:4]
        for number, line in enumerate(lines):
            if not _HEADING.match(line):
                continue
            title = title_case(re.sub(r"^[\W_]+|[\W_]+$", "", line))
            following = lines[number + 1] if number + 1 < len(lines) else ""
            if following and len(following) < 60 and not following.endswith(_PARAGRAPH_END):
                title = f"{title} · {title_case(following)}"
            starts.append(_Start(title[:MAX_TITLE_LENGTH], index))
            break
    before = sum(count_words(text) for text in pages[: starts[0].page]) if starts else 0
    if starts and before >= FRONT_MATTER_WORDS:
        starts[0] = starts[0]._replace(page=0)  # leitura antes do 1º título entra nele
    return starts


def _pages_title(first: int, last: int) -> str:
    return f"Página {first + 1}" if first == last else f"Páginas {first + 1}–{last + 1}"


def build_chapters(
    pages: list[str], outline: list[OutlineItem] | list[tuple[str, int]]
) -> list[Chapter]:
    """Capítulos do livro, nesta ordem de preferência:
    1. sumário do PDF (1º e 2º nível), sem capa/direitos/"sobre o autor" nas pontas;
    2. títulos "Chapter …"/"Capítulo …" no começo das páginas;
    3. seções de ~1.500 palavras cortadas na virada de página.
    Cabeçalhos e números de página saem do texto, seções minúsculas juntam com a seguinte e
    capítulos longos viram partes de ~2.500 palavras."""
    pages = strip_running_lines(pages)
    items = [item if isinstance(item, OutlineItem) else OutlineItem(*item) for item in outline]

    starts, end = _outline_starts(pages, items)
    if len(starts) >= 2:  # um item só não divide nada
        return _finish(_sections(pages, starts, end))

    headings = _heading_starts(pages)
    if len(headings) >= 2:
        return _finish(_sections(pages, headings, len(pages)))

    chapters: list[Chapter] = []
    first = 0
    words = 0
    for index, text in enumerate(pages):
        words += count_words(text)
        if words >= SECTION_WORDS or index == len(pages) - 1:
            title = _pages_title(first, index)
            chapters.extend(_sections(pages, [_Start(title, first)], index + 1))
            first, words = index + 1, 0
    return chapters
