import base64
import binascii
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.auth.security import get_current_user
from app.db import get_session
from app.stats.models import DailyStats
from app.stats.service import local_today
from app.users.models import User
from app.vocabulary import translator, vision
from app.vocabulary.models import SentenceTranslation

# Tradução flutuante: texto de fora do app (mangá, HQ, site), lido pelo OCR do aparelho ou, se a
# pessoa pedir, pela IA. Não conta leitura (meta, ofensiva, XP): só traduz.
router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_session)]

# o MyMemory recusa consultas acima de 500 bytes
MAX_SCREEN_TEXT_LENGTH = 450
MAX_SCREEN_TRANSLATION_LENGTH = 900
DAILY_SCREEN_LIMIT = 60  # idas ao MyMemory por usuário/dia; cache não conta
DAILY_AI_LIMIT = 20  # imagens enviadas à IA por usuário/dia
# recorte já reduzido no aparelho (~1024 px, JPEG): 1,5 MB em base64 sobra
MAX_IMAGE_BASE64_LENGTH = 1_500_000
_IMAGE_TYPES = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}


class ScreenTextIn(BaseModel):
    text: Annotated[str, StringConstraints(min_length=1, max_length=MAX_SCREEN_TEXT_LENGTH)]


class ScreenImageIn(BaseModel):
    image: Annotated[str, StringConstraints(min_length=1, max_length=MAX_IMAGE_BASE64_LENGTH)]


class ScreenTranslationOut(BaseModel):
    text: str
    translation: str | None


def _count_call(
    session: Session, user_id: int, column: InstrumentedAttribute[int], limit: int, detail: str
) -> None:
    """Conta a ida ao serviço antes de fazê-la; passou do limite do dia, 429 e nada é gravado."""
    today = local_today()
    stmt = insert(DailyStats).values({"user_id": user_id, "day": today, column.key: 1})
    used = session.scalar(
        stmt.on_conflict_do_update(
            index_elements=[DailyStats.user_id, DailyStats.day], set_={column.key: column + 1}
        ).returning(column)
    )
    if (used or 0) > limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
    session.commit()  # devolve a conexão ao pool durante a chamada externa


@router.post("/translate-text")
def translate_text(
    body: ScreenTextIn, user: CurrentUser, session: DbSession
) -> ScreenTranslationOut:
    """Tradução de um trecho lido da tela pelo OCR do aparelho."""
    text = " ".join(body.text.split())
    if not any(char.isalpha() for char in text):
        raise HTTPException(422, detail="Nenhum texto para traduzir")
    cached = session.scalar(
        select(SentenceTranslation.translation).where(SentenceTranslation.text == text)
    )
    if cached is not None:
        return ScreenTranslationOut(text=text, translation=cached)

    _count_call(
        session,
        user.id,
        DailyStats.screen_translations,
        DAILY_SCREEN_LIMIT,
        "Limite diário de traduções da tela atingido",
    )
    translation = translator.translate(text, max_length=MAX_SCREEN_TRANSLATION_LENGTH)
    if translation is not None:
        session.execute(
            insert(SentenceTranslation)
            .values(text=text, translation=translation)
            .on_conflict_do_nothing()
        )
        session.commit()
    return ScreenTranslationOut(text=text, translation=translation)


@router.post("/translate-image")
def translate_image(
    body: ScreenImageIn, user: CurrentUser, session: DbSession
) -> ScreenTranslationOut:
    """Recorte da tela lido e traduzido pela IA (quando o OCR do aparelho não dá conta)."""
    if not vision.available():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, detail="Tradução com IA indisponível"
        )
    try:
        raw = base64.b64decode(body.image, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, detail="Imagem inválida") from None
    mime = next((m for magic, m in _IMAGE_TYPES.items() if raw.startswith(magic)), None)
    if mime is None:
        raise HTTPException(422, detail="Imagem inválida")

    # vaga na janela da conta (40/min para todos) antes da cota do dia, que não deve ser gasta
    # quando a IA está cheia
    if not vision.limiter.try_acquire():
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muita gente usando a IA agora. Tente de novo em instantes.",
        )
    _count_call(
        session,
        user.id,
        DailyStats.ai_translations,
        DAILY_AI_LIMIT,
        "Limite diário de traduções com IA atingido",
    )
    result = vision.translate_image(f"data:{mime};base64,{body.image}")
    if result is None:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="Não deu para traduzir a imagem")
    original, translation = result
    return ScreenTranslationOut(text=original, translation=translation or None)
