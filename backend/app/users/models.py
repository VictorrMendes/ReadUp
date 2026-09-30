from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("english_level IN ('A1','A2','B1','B2','C1')", name="english_level"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    english_level: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # último envio de progresso em qualquer texto: orçamento de tempo de leitura por usuário
    last_reading_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
