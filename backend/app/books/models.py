from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Book(Base):
    """PDF enviado pelo usuário. Privado; os capítulos são linhas de articles com book_id."""

    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("page_count >= 0", name="page_count_non_negative"),
        CheckConstraint("word_count >= 0", name="word_count_non_negative"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    # nome gerado pelo servidor (uuid4.pdf); o nome original do usuário nunca vira caminho
    file_name: Mapped[str] = mapped_column(Text)
    page_count: Mapped[int] = mapped_column(Integer)
    word_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
