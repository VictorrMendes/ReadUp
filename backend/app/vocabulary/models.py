from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SavedWord(Base):
    __tablename__ = "saved_words"
    __table_args__ = (
        UniqueConstraint("user_id", "word"),
        CheckConstraint("box BETWEEN 0 AND 6", name="box_range"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    word: Mapped[str] = mapped_column(Text)
    translation: Mapped[str | None] = mapped_column(Text)
    context: Mapped[str | None] = mapped_column(Text)
    article_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("articles.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # revisão espaçada (caixas de Leitner, ver app/vocabulary/review.py): caixa atual e dia local
    # da próxima revisão; due_on null = palavra dominada, fora da fila
    box: Mapped[int] = mapped_column(SmallInteger, server_default="0")
    due_on: Mapped[date | None] = mapped_column(Date)


class SentenceTranslation(Base):
    """Cache global de traduções de frases dos textos (chave: a frase com espaços normalizados)."""

    __tablename__ = "sentence_translations"

    text: Mapped[str] = mapped_column(Text, primary_key=True)
    translation: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WordTranslation(Base):
    """Cache global de traduções (de todos os usuários): cada palavra é buscada fora uma vez só."""

    __tablename__ = "word_translations"

    word: Mapped[str] = mapped_column(Text, primary_key=True)  # já normalizada
    translation: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text, server_default="mymemory")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
