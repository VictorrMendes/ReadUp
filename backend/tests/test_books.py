import io
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from pypdf import PdfWriter
from pypdf.generic import ContentStream, DecodedStreamObject, DictionaryObject, NameObject
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.books import pdf
from app.books.models import Book
from app.books.pdf import SECTION_WORDS, build_chapters, clean, extract
from app.db import engine
from app.reading.models import ReadingProgress
from app.vocabulary import translator
from app.vocabulary.models import SavedWord
from tests.conftest import MakeUser, client, open_session, post

# --- PDFs de teste (Helvetica, texto de verdade, sem rede nem arquivos fixos) ---


def make_pdf(
    pages: list[list[str]],
    outline: list[tuple[str, int]] | None = None,
    children: list[tuple[str, int]] | None = None,
    password: str | None = None,
) -> bytes:
    """PDF com uma página por lista de linhas; `outline` = sumário de 1º nível (título,
    página); `children` = subitens do primeiro item (devem ser ignorados)."""
    writer = PdfWriter()
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    for lines in pages:
        page = writer.add_blank_page(612, 792)
        ops = ["BT", "/F1 11 Tf", "14 TL", "72 740 Td"]
        for line in lines:
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            ops.append(f"({escaped}) Tj T*")
        ops.append("ET")
        stream = DecodedStreamObject()
        stream.set_data("\n".join(ops).encode("latin-1"))
        page[NameObject("/Resources")] = DictionaryObject(
            {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
        )
        page.replace_contents(ContentStream(stream, None))
    first = None
    for title, page_number in outline or []:
        item = writer.add_outline_item(title, page_number)
        first = first or item
    for title, page_number in children or []:
        writer.add_outline_item(title, page_number, parent=first)
    if password:
        writer.encrypt(password)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def words(count: int, word: str = "reading") -> str:
    return " ".join([word] * count)


def lines_of(total_words: int, per_line: int = 12) -> list[str]:
    """Linhas cheias de `per_line` palavras; a última termina parágrafo."""
    lines = [words(per_line) for _ in range(total_words // per_line)]
    rest = total_words % per_line
    if rest:
        lines.append(words(rest))
    lines[-1] += "."
    return lines


# --- pdf.py (puro) ---


def test_clean_joins_lines_undoes_hyphenation_and_splits_paragraphs() -> None:
    page = (
        "This is a long line of text that keeps going on and on\n"
        "and the infor-\n"
        "mation continues here without a break in the middle of it\n"
        "Short end.\n"
        "A new paragraph starts right here and it is also quite long\n"
        "Done.\n"
        "\n"
        "After a blank line."
    )

    assert clean(page) == (
        "This is a long line of text that keeps going on and on and the information continues"
        " here without a break in the middle of it Short end.\n\n"
        "A new paragraph starts right here and it is also quite long Done.\n\n"
        "After a blank line."
    )


def test_chapters_follow_the_outline_and_front_matter_joins_the_first() -> None:
    pages = ["Cover page.", words(120) + ".", words(100, "one") + ".", "More of chapter one."]
    outline = [("Chapter One", 2), ("Intro", 1)]  # fora de ordem de propósito

    chapters = build_chapters(pages, outline)

    assert [(c.title, c.content.split("\n\n")[0]) for c in chapters] == [
        ("Intro", "Cover page."),
        ("Chapter One", words(100, "one") + "."),
    ]
    assert chapters[1].content.endswith("\n\nMore of chapter one.")
    assert [c.word_count for c in chapters] == [122, 104]


def test_tiny_outline_chapters_are_joined_to_the_next() -> None:
    # sumário com itens minúsculos (1 palavra) não pode virar centenas de "capítulos"
    pages = ["Tiny.", "Small.", words(150) + ".", "Mini.", words(120) + ".", "End."]
    outline = [(f"Item {i}", i) for i in range(6)]

    chapters = build_chapters(pages, outline)

    # 1+1+150 → "Item 0"; 1+120 → "Item 3"; o último (1 palavra) vai para o anterior
    assert [(c.title, c.word_count) for c in chapters] == [("Item 0", 152), ("Item 3", 122)]
    assert chapters[-1].content.endswith("End.")
    assert all(c.word_count >= 100 for c in chapters)


def test_without_usable_outline_sections_cut_at_page_breaks() -> None:
    pages = [words(600) + "." for _ in range(5)]

    chapters = build_chapters(pages, [("Only one item", 0)])  # um item só não divide

    # 600 + 600 + 600 ≥ 1.500 na 3ª página; o resto fica na última seção
    assert [c.title for c in chapters] == ["Páginas 1–3", "Páginas 4–5"]
    assert [c.word_count for c in chapters] == [1800, 1200]
    assert all(c.word_count >= 600 for c in chapters)
    assert SECTION_WORDS == 1500


def test_single_page_section_and_empty_sections_are_removed() -> None:
    pages = [words(1500) + ".", "", "   ", words(110) + "."]

    by_pages = build_chapters(pages, [])
    by_outline = build_chapters(pages, [("One", 0), ("Empty", 1), ("Blank", 2), ("Last", 3)])

    assert [c.title for c in by_pages] == ["Página 1", "Páginas 2–4"]
    assert [c.title for c in by_outline] == ["One", "Last"]


def test_extract_reads_text_and_first_level_outline() -> None:
    data = make_pdf(
        [["Intro line."], ["Chapter text."], ["More text."]],
        outline=[("Intro", 0), ("Chapter", 1)],
        children=[("Sub item", 2)],
    )

    pages, outline = extract(io.BytesIO(data))

    assert [page.strip() for page in pages] == ["Intro line.", "Chapter text.", "More text."]
    assert outline == [("Intro", 0), ("Chapter", 1)]


# --- endpoints ---


@pytest.fixture(autouse=True)
def storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    monkeypatch.setenv("PDF_STORAGE_DIR", str(tmp_path))
    yield tmp_path
    for file in tmp_path.iterdir():
        file.unlink()


def upload(headers: dict[str, str], data: bytes, name: str = "My Book.pdf") -> Any:
    return client.post("/books", files={"file": (name, data, "application/pdf")}, headers=headers)


BOOK_PDF = make_pdf(
    [lines_of(120), lines_of(90), lines_of(160)],
    outline=[("Chapter One", 0), ("Chapter Two", 2)],
)


def books_of(user_id: int) -> int:
    with Session(engine) as session:
        return (
            session.scalar(select(func.count()).select_from(Book).where(Book.user_id == user_id))
            or 0
        )


def test_requires_token() -> None:
    assert upload({}, BOOK_PDF).status_code == 401
    assert client.get("/books").status_code == 401
    assert client.get("/books/1").status_code == 401
    assert client.delete("/books/1").status_code == 401


def test_upload_valid_pdf_creates_book_chapters_and_file(
    make_user: MakeUser, storage: Path
) -> None:
    user_id, headers = make_user()

    response = upload(headers, BOOK_PDF)

    assert response.status_code == 201
    book = response.json()
    assert (book["title"], book["page_count"], book["chapter_count"]) == ("My Book", 3, 2)
    assert (book["word_count"], book["words_read"], book["progress"]) == (370, 0, 0)
    assert [(c["title"], c["position"], c["word_count"]) for c in book["chapters"]] == [
        ("Chapter One", 1, 210),
        ("Chapter Two", 2, 160),
    ]
    assert book["chapters"][0]["estimated_minutes"] == 2
    files = list(storage.iterdir())
    assert len(files) == 1
    assert len(files[0].stem) == 32 and files[0].suffix == ".pdf"  # uuid4 hex
    assert files[0].read_bytes() == BOOK_PDF
    with Session(engine) as session:
        stored = session.scalar(select(Book).where(Book.user_id == user_id))
        chapters = session.scalars(select(Article).where(Article.book_id == book["id"])).all()
    assert stored is not None and stored.file_name == files[0].name
    assert {(a.source, a.category, a.difficulty) for a in chapters} == {("pdf", "Livro", None)}


def test_malicious_file_name_is_only_a_title(make_user: MakeUser, storage: Path) -> None:
    _, headers = make_user()

    response = upload(headers, BOOK_PDF, name="../../etc/passwd.pdf")

    assert response.status_code == 201
    assert response.json()["title"] == "../../etc/passwd"
    assert [file.parent for file in storage.iterdir()] == [storage]
    assert "passwd" not in next(storage.iterdir()).name


@pytest.mark.parametrize(
    ("name", "expected"), [("   .pdf", "Livro sem título"), ("x" * 200 + ".pdf", "x" * 120)]
)
def test_title_fallback_and_limit(make_user: MakeUser, name: str, expected: str) -> None:
    _, headers = make_user()
    assert upload(headers, BOOK_PDF, name=name).json()["title"] == expected


@pytest.mark.parametrize(
    ("data", "detail"),
    [
        pytest.param(b"hello, I am a text file", "Arquivo não é um PDF", id="texto com .pdf"),
        pytest.param(
            b"%PDF-1.7\n" + b"garbage" * 100, "Não foi possível ler este PDF", id="corrompido"
        ),
        pytest.param(
            BOOK_PDF[: len(BOOK_PDF) // 2], "Não foi possível ler este PDF", id="truncado"
        ),
        pytest.param(
            make_pdf([["Secret."]], password="s3cret"),
            "Não foi possível ler este PDF",
            id="com senha",
        ),
        pytest.param(
            make_pdf([[], []]),
            "Este PDF não tem texto selecionável (PDF digitalizado não é suportado)",
            id="sem texto",
        ),
    ],
)
def test_invalid_pdf_is_422_and_nothing_is_stored(
    make_user: MakeUser, storage: Path, data: bytes, detail: str
) -> None:
    user_id, headers = make_user()

    response = upload(headers, data)

    assert (response.status_code, response.json()) == (422, {"detail": detail})
    assert list(storage.iterdir()) == []
    assert books_of(user_id) == 0


@pytest.mark.parametrize(("limit", "value"), [("MAX_PAGES", 2), ("MAX_CHARS", 100)])
def test_page_and_text_limits_are_422(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch, limit: str, value: int
) -> None:
    _, headers = make_user()
    monkeypatch.setattr(pdf, limit, value)

    assert upload(headers, BOOK_PDF).status_code == 422


def decompression_bomb() -> bytes:
    """PDF de ~11 KB cujo stream de conteúdo descompactado passa de 11 MB."""
    writer = PdfWriter()
    page = writer.add_blank_page(612, 792)
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 11 Tf 72 740 Td (boom) Tj ET" + b" " * 11_000_000)
    page.replace_contents(stream.flate_encode())
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_stream_over_decompression_limit_is_422(
    make_user: MakeUser, storage: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, headers = make_user()
    bomb = decompression_bomb()

    response = upload(headers, bomb)

    assert len(bomb) < 100_000
    assert (response.status_code, response.json()) == (
        422,
        {"detail": "Não foi possível ler este PDF"},
    )
    assert list(storage.iterdir()) == []
    # é o limite de 10 MB que recusa: com o padrão do pypdf (75 MB) o mesmo arquivo abre
    monkeypatch.setattr(pdf, "_STREAM_LIMITS", {})
    pages, _ = extract(io.BytesIO(bomb))
    assert len(pages) == 1


@pytest.mark.parametrize(
    "size",
    [
        pytest.param(20 * 1024 * 1024 + 1, id="1 byte acima (conferido no endpoint)"),
        pytest.param(21 * 1024 * 1024, id="corpo cortado no meio do envio"),
    ],
)
def test_upload_over_20_mb_is_413_and_nothing_is_stored(
    make_user: MakeUser, storage: Path, size: int
) -> None:
    user_id, headers = make_user()

    response = upload(headers, b"%PDF-" + b"0" * (size - 5))

    assert (response.status_code, response.json()) == (413, {"detail": "PDF maior que 20 MB"})
    assert list(storage.iterdir()) == []
    assert books_of(user_id) == 0


def test_21st_book_is_409(make_user: MakeUser, storage: Path) -> None:
    user_id, headers = make_user()
    with Session(engine) as session:
        session.add_all(
            Book(user_id=user_id, title=f"B{i}", file_name=f"{i}.pdf", page_count=1, word_count=1)
            for i in range(20)
        )
        session.commit()

    response = upload(headers, BOOK_PDF)

    assert (response.status_code, response.json()) == (
        409,
        {"detail": "Limite de 20 livros atingido"},
    )
    assert list(storage.iterdir()) == []
    assert books_of(user_id) == 20


def test_list_detail_and_delete_only_by_owner(make_user: MakeUser, storage: Path) -> None:
    user_id, headers = make_user()
    _, other = make_user()
    older = upload(headers, BOOK_PDF, name="Older.pdf").json()
    newer = upload(headers, BOOK_PDF, name="Newer.pdf").json()
    chapter_ids = [c["id"] for c in older["chapters"]]

    listed = client.get("/books", headers=headers).json()
    theirs = client.get("/books", headers=other).json()
    detail = client.get(f"/books/{older['id']}", headers=headers)
    not_found = {"detail": "Livro não encontrado"}
    by_other = [
        client.get(f"/books/{older['id']}", headers=other),
        client.delete(f"/books/{older['id']}", headers=other),
        client.get("/books/999999999", headers=headers),
    ]

    assert [b["title"] for b in listed] == ["Newer", "Older"]
    assert set(listed[0]) == {
        "id", "title", "page_count", "word_count", "chapter_count", "words_read", "progress",
        "created_at",
    }  # fmt: skip
    assert theirs == []
    assert detail.json() == older
    assert [(r.status_code, r.json()) for r in by_other] == [(404, not_found)] * 3
    assert len(list(storage.iterdir())) == 2  # nada mudou

    deleted = client.delete(f"/books/{older['id']}", headers=headers)

    assert (deleted.status_code, deleted.content) == (204, b"")
    assert len(list(storage.iterdir())) == 1
    assert client.get(f"/books/{older['id']}", headers=headers).status_code == 404
    with Session(engine) as session:
        assert session.scalar(select(func.count()).where(Article.id.in_(chapter_ids))) == 0
    assert books_of(user_id) == 1
    assert newer["id"] in {b["id"] for b in client.get("/books", headers=headers).json()}


# --- controle de acesso aos capítulos (articles com book_id) ---


def test_chapters_are_private_to_the_book_owner(
    make_user: MakeUser, monkeypatch: pytest.MonkeyPatch
) -> None:
    owner_id, owner = make_user()
    other_id, other = make_user()
    monkeypatch.setattr(translator, "translate", lambda word: "leitura")
    book = upload(owner, BOOK_PDF).json()
    first, second = (c["id"] for c in book["chapters"])
    missing = {"detail": "Texto não encontrado"}

    # dono: lê o capítulo como um texto normal (palavras, XP), no "continuar lendo" e no vocabulário
    open_session(owner_id, owner, first)
    read = post(owner, article_id=first, progress=50, seconds=15).json()
    mine = client.get(f"/articles/{first}", headers=owner).json()
    last = client.get(f"/articles/{second}", headers=owner).json()
    owner_feed = {a["id"] for a in client.get("/articles?limit=50", headers=owner).json()}
    owner_continue = client.get("/articles?in_progress=true", headers=owner).json()
    saved = client.post("/vocabulary", json={"word": "reading", "article_id": first}, headers=owner)
    book_after = client.get(f"/books/{book['id']}", headers=owner).json()

    assert (read["words_credited"], read["xp_gained"]) == (105, 10)
    assert (mine["book_id"], mine["next_article_id"], mine["progress"]) == (book["id"], second, 50)
    assert (last["book_id"], last["next_article_id"]) == (book["id"], None)
    assert first not in owner_feed and second not in owner_feed  # feed é só público
    assert [a["id"] for a in owner_continue] == [first]
    assert saved.status_code == 201
    assert (book_after["words_read"], book_after["chapters"][0]["progress"]) == (105, 50)

    # outro usuário: tudo como se o capítulo não existisse, e nada é gravado
    detail = client.get(f"/articles/{first}", headers=other)
    progress = post(other, article_id=first, progress=100, seconds=15)
    vocabulary = client.post(
        "/vocabulary", json={"word": "reading", "article_id": first}, headers=other
    )
    other_feed = {a["id"] for a in client.get("/articles?limit=50", headers=other).json()}
    other_continue = client.get("/articles?in_progress=true", headers=other).json()

    assert (detail.status_code, detail.json()) == (404, missing)
    assert (progress.status_code, progress.json()) == (404, missing)
    assert (vocabulary.status_code, vocabulary.json()) == (404, missing)
    assert first not in other_feed and second not in other_feed
    assert other_continue == []
    with Session(engine) as session:
        progress_rows = session.scalar(
            select(func.count()).where(ReadingProgress.user_id == other_id)
        )
        saved_rows = session.scalar(select(func.count()).where(SavedWord.user_id == other_id))
    assert (progress_rows, saved_rows) == (0, 0)


def test_feed_articles_have_no_book(make_user: MakeUser, article_id: int) -> None:
    _, headers = make_user()

    detail = client.get(f"/articles/{article_id}", headers=headers).json()

    assert (detail["book_id"], detail["next_article_id"]) == (None, None)
