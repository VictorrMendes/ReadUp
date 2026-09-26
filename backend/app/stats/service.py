import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.stats.models import DailyStats

# ponytail: fuso único; fuso por usuário quando houver usuários fora do Brasil
APP_TIMEZONE = ZoneInfo(os.environ.get("APP_TIMEZONE", "America/Sao_Paulo"))


def local_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def add_daily_activity(
    session: Session, user_id: int, words: int, seconds: int, texts_completed: int
) -> None:
    """Soma a atividade no dia local do usuário (upsert). Nada a somar → não cria linha."""
    if not (words or seconds or texts_completed):
        return
    stmt = insert(DailyStats).values(
        user_id=user_id,
        day=local_today(),
        words_read=words,
        seconds_read=seconds,
        texts_completed=texts_completed,
    )
    session.execute(
        stmt.on_conflict_do_update(
            index_elements=[DailyStats.user_id, DailyStats.day],
            set_={
                "words_read": DailyStats.words_read + stmt.excluded.words_read,
                "seconds_read": DailyStats.seconds_read + stmt.excluded.seconds_read,
                "texts_completed": DailyStats.texts_completed + stmt.excluded.texts_completed,
            },
        )
    )
