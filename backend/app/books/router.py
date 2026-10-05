import io
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, computed_field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.articles.models import Article
from app.articles.text import estimated_minutes
from app.auth.security import get_current_user
from app.books.models import Book
from app.books.pdf import PdfError, build_chapters, extract
from app.db import get_session
from app.reading.models import ReadingProgress
from app.reading.rules import progress_percent
from app.users.models import User

router = APIRouter(prefix="/books", tags=["books"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]

MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_BOOKS_PER_USER = 20
MAX_TITLE_LENGTH = 120
CHUNK_BYTES = 64 * 1024
TOO_LARGE = "PDF maior que 20 MB"
NOT_FOUND = "Livro não encontrado"


def storage_dir() -> Path:
    return Path(os.environ.get("PDF_STORAGE_DIR", "/app/storage/pdfs"))


class UploadSizeLimit:
    """Corta o upload de POST /books (e o recorte da tradução flutuante) assim que o corpo passa
    do limite, contando os bytes que chegam (não confia no Content-Length). Sem isso o multipart
    inteiro seria recebido e gravado em arquivo temporário antes de o endpoint rodar."""

    # folga para os cabeçalhos do multipart; o limite exato do PDF é conferido no endpoint
    MAX_BODY_BYTES = MAX_PDF_BYTES + 64 * 1024
    # o recorte da tradução flutuante vem em JSON (base64): mesmo corte antes de ler tudo
    LIMITS = {"/books": MAX_BODY_BYTES, "/vocabulary/translate-image": 2 * 1024 * 1024}

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        limit = (
            self.LIMITS.get(scope["path"])
            if scope["type"] == "http" and scope["method"] == "POST"
            else None
        )
        if limit is None:
            await self.app(scope, receive, send)
            return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            if received > limit:
                # o FastAPI repassa HTTPException levantada durante a leitura do corpo
                raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail=TOO_LARGE)
            return message

        await self.app(scope, limited_receive, send)


class BookOut(BaseModel):
    id: int
    title: str
    page_count: int
    word_count: int
    chapter_count: int
    words_read: int
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def progress(self) -> int:
        return progress_percent(self.words_read, self.word_count)


class ChapterOut(BaseModel):
    id: int
    title: str
    position: int
    word_count: int
    progress: int
    completed: bool

    @computed_field  # type: ignore[prop-decorator]
    @property
    def estimated_minutes(self) -> int:
        return estimated_minutes(self.word_count)


class BookDetail(BookOut):
    chapters: list[ChapterOut]


def _title(file_name: str | None) -> str:
    """Nome original sem a extensão, só como texto: nunca entra em caminho."""
    # navegadores e apps às vezes mandam o nome codificado ("The%20Last%20Wish_%20...")
    name = unquote(file_name or "")
    if name.lower().endswith(".pdf"):
        name = name[:-4]
    name = name.replace("_", " ")
    # "harry-potter-and-the-stone": sem espaços, o hífen era separador de palavras
    if " " not in name.strip() and name.count("-") >= 2:
        name = name.replace("-", " ")
    name = " ".join(name.split())
    return name[:MAX_TITLE_LENGTH] or "Livro sem título"


def _read_limited(file: UploadFile) -> bytes:
    data = bytearray()
    while chunk := file.file.read(CHUNK_BYTES):
        data += chunk
        if len(data) > MAX_PDF_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail=TOO_LARGE)
    return bytes(data)


def _detail(session: Session, user_id: int, book_id: int) -> BookDetail:
    book = session.scalar(select(Book).where(Book.id == book_id, Book.user_id == user_id))
    if book is None:  # inexistente ou de outro usuário: mesma resposta
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    rows = session.execute(
        select(
            Article.id,
            Article.title,
            Article.position,
            Article.word_count,
            ReadingProgress.progress,
            ReadingProgress.words_read,
            ReadingProgress.completed_at,
        )
        .outerjoin(
            ReadingProgress,
            (ReadingProgress.article_id == Article.id) & (ReadingProgress.user_id == user_id),
        )
        .where(Article.book_id == book.id)
        .order_by(Article.position)
    ).all()
    chapters = [
        ChapterOut(
            id=row.id,
            title=row.title,
            position=row.position or 0,
            word_count=row.word_count,
            progress=row.progress or 0,
            completed=row.completed_at is not None,
        )
        for row in rows
    ]
    return BookDetail(
        id=book.id,
        title=book.title,
        page_count=book.page_count,
        word_count=book.word_count,
        chapter_count=len(chapters),
        words_read=sum(row.words_read or 0 for row in rows),
        created_at=book.created_at,
        chapters=chapters,
    )


# ponytail: processamento síncrono na requisição; um PDF grande segura a requisição (e até
# 20 MB de memória) por alguns segundos. Fila de processamento quando isso pesar.
@router.post("", status_code=status.HTTP_201_CREATED)
def upload_book(file: UploadFile, user: CurrentUser, session: DbSession) -> BookDetail:
    user_id = user.id
    # validação do mais barato para o mais caro, antes de gravar qualquer coisa
    data = _read_limited(file)
    if not data.startswith(b"%PDF-"):  # assinatura; content-type e extensão não bastam
        raise HTTPException(422, detail="Arquivo não é um PDF")

    # trava o usuário: uploads simultâneos não passam juntos do limite de livros
    session.execute(select(User.id).where(User.id == user_id).with_for_update())
    books = session.scalar(select(func.count()).select_from(Book).where(Book.user_id == user_id))
    if (books or 0) >= MAX_BOOKS_PER_USER:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=f"Limite de {MAX_BOOKS_PER_USER} livros atingido"
        )

    try:
        pages, outline = extract(io.BytesIO(data))
    except PdfError as e:
        raise HTTPException(422, detail=str(e)) from e
    chapters = build_chapters(pages, outline)
    if not chapters:
        raise HTTPException(
            422, detail="Este PDF não tem texto selecionável (PDF digitalizado não é suportado)"
        )

    path = storage_dir() / f"{uuid.uuid4().hex}.pdf"  # nome gerado; o original vira só título
    path.write_bytes(data)
    try:
        book = Book(
            user_id=user_id,
            title=_title(file.filename),
            file_name=path.name,
            page_count=len(pages),
            word_count=sum(chapter.word_count for chapter in chapters),
        )
        session.add(book)
        session.flush()
        session.add_all(
            Article(
                title=chapter.title,
                content=chapter.content,
                source="pdf",
                category="Livro",
                difficulty=None,
                word_count=chapter.word_count,
                book_id=book.id,
                position=position,
            )
            for position, chapter in enumerate(chapters, start=1)
        )
        session.commit()
    except BaseException:
        path.unlink(missing_ok=True)  # sem arquivo órfão se o banco falhar
        raise
    return _detail(session, user_id, book.id)


@router.get("")
def list_books(user: CurrentUser, session: DbSession) -> list[BookOut]:
    rows = session.execute(
        select(
            Book,
            func.count(Article.id),
            func.coalesce(func.sum(ReadingProgress.words_read), 0),
        )
        .outerjoin(Article, Article.book_id == Book.id)
        .outerjoin(
            ReadingProgress,
            (ReadingProgress.article_id == Article.id) & (ReadingProgress.user_id == user.id),
        )
        .where(Book.user_id == user.id)
        .group_by(Book.id)
        .order_by(Book.created_at.desc(), Book.id.desc())
    )
    return [
        BookOut(
            id=book.id,
            title=book.title,
            page_count=book.page_count,
            word_count=book.word_count,
            chapter_count=chapter_count,
            words_read=words_read,
            created_at=book.created_at,
        )
        for book, chapter_count, words_read in rows
    ]


@router.get("/{book_id}")
def get_book(book_id: int, user: CurrentUser, session: DbSession) -> BookDetail:
    return _detail(session, user.id, book_id)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, user: CurrentUser, session: DbSession) -> None:
    # capítulos (articles) e o progresso deles saem em cascata
    file_name = session.scalar(
        delete(Book).where(Book.id == book_id, Book.user_id == user.id).returning(Book.file_name)
    )
    if file_name is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    session.commit()
    (storage_dir() / file_name).unlink(missing_ok=True)
