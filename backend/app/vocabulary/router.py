from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, StringConstraints
from sqlalchemy import Select, delete, exists, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.auth.security import get_current_user
from app.books.access import visible_to
from app.db import get_session
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.users.models import User
from app.vocabulary import translator
from app.vocabulary.models import SavedWord, SentenceTranslation, WordTranslation
from app.vocabulary.review import DAILY_REVIEW_LIMIT, first_due, next_state, review_xp
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
            due_on=first_due(local_today()),
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


# --- revisão espaçada ---


class ReviewCard(BaseModel):
    id: int
    word: str
    translation: str | None
    context: str | None
    box: int


class ReviewQueue(BaseModel):
    cards: list[ReviewCard]  # para revisar agora (já respeita o limite diário)
    due_total: int  # vencidas hoje, sem o limite
    reviewed_today: int
    daily_limit: int


class ReviewIn(BaseModel):
    known: bool  # "já sei" / "ainda aprendendo"


class ReviewOut(BaseModel):
    box: int
    due_on: date | None
    mastered: bool
    xp_gained: int
    reviewed_today: int


def _reviewed_today(session: Session, user_id: int, today: date) -> int:
    reviewed = session.scalar(
        select(DailyStats.words_reviewed).where(
            DailyStats.user_id == user_id, DailyStats.day == today
        )
    )
    return reviewed or 0


@router.get("/review")
def review_queue(user: CurrentUser, session: DbSession) -> ReviewQueue:
    today = local_today()
    reviewed = _reviewed_today(session, user.id, today)
    due = (SavedWord.user_id == user.id) & (SavedWord.due_on <= today)
    due_total = session.scalar(select(func.count()).select_from(SavedWord).where(due)) or 0
    remaining = max(0, DAILY_REVIEW_LIMIT - reviewed)
    rows = session.execute(
        select(
            SavedWord.id,
            SavedWord.word,
            func.coalesce(SavedWord.translation, WordTranslation.translation).label("translation"),
            SavedWord.context,
            SavedWord.box,
        )
        .outerjoin(WordTranslation, WordTranslation.word == SavedWord.word)
        .where(due)
        .order_by(SavedWord.due_on, SavedWord.id)
        .limit(remaining)
    ).all()
    return ReviewQueue(
        cards=[ReviewCard.model_validate(row, from_attributes=True) for row in rows],
        due_total=due_total,
        reviewed_today=reviewed,
        daily_limit=DAILY_REVIEW_LIMIT,
    )


@router.post("/{word_id}/review")
def review_word(word_id: int, body: ReviewIn, user: CurrentUser, session: DbSession) -> ReviewOut:
    """Responde uma palavra da fila de hoje. Só palavras vencidas e dentro do limite diário: sem
    isso daria para responder a mesma palavra várias vezes e acumular XP."""
    user_id = user.id
    today = local_today()
    # trava o usuário antes da palavra e do dia (mesma ordem do registro de leitura): respostas
    # simultâneas não passam juntas do limite nem do teto de XP
    session.execute(select(User.id).where(User.id == user_id).with_for_update())
    saved = session.scalar(
        select(SavedWord)
        .where(SavedWord.id == word_id, SavedWord.user_id == user_id)
        .with_for_update()
    )
    if saved is None:  # de outro usuário ou inexistente: mesma resposta
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Palavra não encontrada")
    if saved.due_on is None or saved.due_on > today:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Palavra fora da revisão de hoje")

    stmt = insert(DailyStats).values(user_id=user_id, day=today, words_reviewed=1)
    reviewed, xp_today = session.execute(
        stmt.on_conflict_do_update(
            index_elements=[DailyStats.user_id, DailyStats.day],
            set_={"words_reviewed": DailyStats.words_reviewed + 1},
        ).returning(DailyStats.words_reviewed, DailyStats.review_xp)
    ).one()
    if reviewed > DAILY_REVIEW_LIMIT:  # sem commit: a sessão desfaz a contagem
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Limite diário de revisão atingido")

    gained = review_xp(body.known, xp_today)
    if gained:
        session.execute(
            update(DailyStats)
            .where(DailyStats.user_id == user_id, DailyStats.day == today)
            .values(review_xp=DailyStats.review_xp + gained, xp=DailyStats.xp + gained)
        )
    saved.box, saved.due_on = next_state(saved.box, body.known, today)
    session.commit()
    return ReviewOut(
        box=saved.box,
        due_on=saved.due_on,
        mastered=saved.due_on is None,
        xp_gained=gained,
        reviewed_today=reviewed,
    )


# --- tradução de frase ---

MAX_SENTENCE_LENGTH = 300  # o mesmo teto do contexto salvo
MAX_SENTENCE_TRANSLATION_LENGTH = 600
DAILY_SENTENCE_LIMIT = 30  # idas ao serviço externo por usuário/dia; cache não conta


class SentenceIn(BaseModel):
    article_id: int
    text: Annotated[str, StringConstraints(min_length=1, max_length=MAX_SENTENCE_LENGTH)]


class SentenceOut(BaseModel):
    text: str
    translation: str | None


def _collapse(text: str) -> str:
    return " ".join(text.split())


@router.post("/translate-sentence")
def translate_sentence(body: SentenceIn, user: CurrentUser, session: DbSession) -> SentenceOut:
    """Tradução de uma frase do texto que a pessoa está lendo. Não é tradutor de texto livre: a
    frase precisa existir num texto visível para ela (feed ou capítulo dos próprios livros)."""
    user_id = user.id
    text = _collapse(body.text)
    if not any(char.isalpha() for char in text):
        raise HTTPException(422, detail="Frase inválida")
    content = session.scalar(
        select(Article.content).where(Article.id == body.article_id, visible_to(user_id))
    )
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Texto não encontrado")
    if text not in _collapse(content):
        raise HTTPException(422, detail="A frase não está neste texto")

    cached = session.scalar(
        select(SentenceTranslation.translation).where(SentenceTranslation.text == text)
    )
    if cached is not None:
        return SentenceOut(text=text, translation=cached)

    # conta a ida ao serviço antes de fazê-la; passou do limite, nada é gravado
    today = local_today()
    stmt = insert(DailyStats).values(user_id=user_id, day=today, sentences_translated=1)
    used = session.scalar(
        stmt.on_conflict_do_update(
            index_elements=[DailyStats.user_id, DailyStats.day],
            set_={"sentences_translated": DailyStats.sentences_translated + 1},
        ).returning(DailyStats.sentences_translated)
    )
    if (used or 0) > DAILY_SENTENCE_LIMIT:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, detail="Limite diário de traduções de frase atingido"
        )
    session.commit()  # devolve a conexão ao pool durante a chamada externa

    translation = translator.translate(text, max_length=MAX_SENTENCE_TRANSLATION_LENGTH)
    if translation is not None:
        session.execute(
            insert(SentenceTranslation)
            .values(text=text, translation=translation)
            .on_conflict_do_nothing()
        )
        session.commit()
    return SentenceOut(text=text, translation=translation)
