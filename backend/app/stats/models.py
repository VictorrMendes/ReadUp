from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DailyStats(Base):
    __tablename__ = "daily_stats"
    __table_args__ = (
        CheckConstraint("words_read >= 0", name="words_read_non_negative"),
        CheckConstraint("seconds_read >= 0", name="seconds_read_non_negative"),
        CheckConstraint("xp >= 0", name="xp_non_negative"),
        CheckConstraint("texts_completed >= 0", name="texts_completed_non_negative"),
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    words_read: Mapped[int] = mapped_column(Integer, server_default="0")
    seconds_read: Mapped[int] = mapped_column(Integer, server_default="0")
    xp: Mapped[int] = mapped_column(Integer, server_default="0")
    texts_completed: Mapped[int] = mapped_column(Integer, server_default="0")
