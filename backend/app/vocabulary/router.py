from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, StringConstraints
from sqlalchemy import Select, delete, exists, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.auth.security import get_current_user
from app.books.access import visible_to
from app.db import get_session
from app.users.models import User
from app.vocabulary import translator
from app.vocabulary.models import SavedWord, WordTranslation
from app.vocabulary.words import normalize_word

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]


class LookupOut(BaseModel):
    word: str
    translation: str | None
    saved: bool
    saved_id: int | None


class SaveWordIn(BaseModel):
    # a tradução não entra aqui: vem sempre do nosso cache/serviço
    word: str
    article_id: int | None = None
    context: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] | None = None


class SavedWordOut(BaseModel):
    id: int
    word: str
    translation: str | None
    context: str | None
    article_id: int | None
    article_title: str | None
    created_at: datetime


def _normalized(text: str) -> str:
    word = normalize_word(text)
    if word is None:
        raise HTTPException(422, detail="Palavra inválida")
    return word


def _translation(session: Session, word: str) -> str | None:
    """Tradução do cache global; se não houver, busca no serviço e grava (falha não é cacheada)."""
    cached = session.scalar(select(WordTranslation.translation).where(WordTranslation.word == word))
    if cached is not None:
        return cached
    session.commit()  # devolve a conexão ao pool durante a chamada externa (até 4 s)
    translation = translator.translate(word)
    if translation is not None:
        # pedidos simultâneos da mesma palavra: o segundo insert vira no-op
        session.execute(
            insert(WordTranslation)
            .values(word=word, translation=translation)
            .on_conflict_do_nothing()
        )
        session.commit()
    return translation


def _saved_words(user_id: int) -> Select[SavedWord, str, str]:
    """Palavras do usuário com o título do texto de origem e a tradução, numa query só.

    Palavra salva enquanto a tradução estava indisponível usa a do cache, se já existir.
    """
    return (
        select(
            SavedWord,
            Article.title,
            func.coalesce(SavedWord.translation, WordTranslation.translation),
        )
        .outerjoin(Article, Article.id == SavedWord.article_id)
        .outerjoin(WordTranslation, WordTranslation.word == SavedWord.word)
        .where(SavedWord.user_id == user_id)
    )


def _out(saved: SavedWord, article_title: str | None, translation: str | None) -> SavedWordOut:
    return SavedWordOut(
        id=saved.id,
        word=saved.word,
        translation=translation,
        context=saved.context,
        article_id=saved.article_id,
        article_title=article_title,
        created_at=saved.created_at,
    )


@router.get("/lookup")
def lookup(
    word: Annotated[str, Query(max_length=100)], user: CurrentUser, session: DbSession
) -> LookupOut:
    normalized = _normalized(word)
    saved_id = session.scalar(
        select(SavedWord.id).where(SavedWord.user_id == user.id, SavedWord.word == normalized)
    )
    return LookupOut(
        word=normalized,
        translation=_translation(session, normalized),
        saved=saved_id is not None,
        saved_id=saved_id,
    )


@router.post("")
def save_word(
    body: SaveWordIn, user: CurrentUser, session: DbSession, response: Response
) -> SavedWordOut:
    """Idempotente: palavra nova → 201; já salva → 200 com a existente, sem alterar."""
    user_id = user.id
    word = _normalized(body.word)
    if body.article_id is not None and not session.scalar(
        select(exists().where(Article.id == body.article_id, visible_to(user_id)))
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Texto não encontrado")

    created = session.scalar(
        insert(SavedWord)
        .values(
            user_id=user_id,
            word=word,
            translation=_translation(session, word),
            context=body.context or None,
            article_id=body.article_id,
        )
        .on_conflict_do_nothing(index_elements=["user_id", "word"])
        .returning(SavedWord.id)
    )
    session.commit()
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return _out(*session.execute(_saved_words(user_id).where(SavedWord.word == word)).one())


@router.get("")
def list_words(
    user: CurrentUser,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[SavedWordOut]:
    rows = session.execute(
        _saved_words(user.id)
        .order_by(SavedWord.created_at.desc(), SavedWord.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return [_out(*row) for row in rows]


@router.delete("/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(word_id: int, user: CurrentUser, session: DbSession) -> None:
    # de outro usuário ou inexistente: mesma resposta, sem revelar existência
    deleted = session.scalar(
        delete(SavedWord)
        .where(SavedWord.id == word_id, SavedWord.user_id == user.id)
        .returning(SavedWord.id)
    )
    if deleted is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Palavra não encontrada")
    session.commit()
