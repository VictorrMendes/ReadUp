from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ReadingGoal(Base):
    __tablename__ = "reading_goals"
    __table_args__ = (
        CheckConstraint("goal_type IN ('words')", name="goal_type"),
        CheckConstraint("target > 0", name="target_positive"),
        # uma meta ativa por usuário
        Index(
            "uq_reading_goals_user_id_active",
            "user_id",
            unique=True,
            postgresql_where=text("active"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    goal_type: Mapped[str] = mapped_column(Text, server_default="words")
    target: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
