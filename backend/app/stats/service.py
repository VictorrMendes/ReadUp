import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.gamification.xp import DAILY_GOAL_XP, TEXT_COMPLETED_XP, xp_for_words
from app.goals.service import active_target
from app.stats.models import DailyStats

# ponytail: fuso único; fuso por usuário quando houver usuários fora do Brasil
APP_TIMEZONE = ZoneInfo(os.environ.get("APP_TIMEZONE", "America/Sao_Paulo"))


def local_today() -> date:
    return datetime.now(APP_TIMEZONE).date()


def add_daily_activity(
    session: Session, user_id: int, words: int, seconds: int, texts_completed: int
) -> int:
    """Soma a atividade no dia local do usuário (upsert) e devolve o XP ganho nesta chamada.

    Nada a somar → não cria linha.
    """
    if not (words or seconds or texts_completed):
        return 0
    today = local_today()
    stmt = insert(DailyStats).values(
        user_id=user_id,
        day=today,
        words_read=words,
        seconds_read=seconds,
        texts_completed=texts_completed,
    )
    # O upsert trava a linha do dia até o commit: envios simultâneos do mesmo usuário esperam e
    # enxergam o total já somado, então o XP calculado do RETURNING não se perde nem duplica.
    words_today, goal_met = session.execute(
        stmt.on_conflict_do_update(
            index_elements=[DailyStats.user_id, DailyStats.day],
            set_={
                "words_read": DailyStats.words_read + stmt.excluded.words_read,
                "seconds_read": DailyStats.seconds_read + stmt.excluded.seconds_read,
                "texts_completed": DailyStats.texts_completed + stmt.excluded.texts_completed,
            },
        ).returning(DailyStats.words_read, DailyStats.goal_met)
    ).one()
    row = (DailyStats.user_id == user_id) & (DailyStats.day == today)

    gained = xp_for_words(words_today - words, words_today) + texts_completed * TEXT_COMPLETED_XP
    if gained:
        session.execute(update(DailyStats).where(row).values(xp=DailyStats.xp + gained))

    if not goal_met:
        target = active_target(session, user_id)
        if target is not None and words_today >= target:
            # só quem vira a marca ganha o bônus
            flipped = session.scalar(
                update(DailyStats)
                .where(row, ~DailyStats.goal_met)
                .values(goal_met=True, xp=DailyStats.xp + DAILY_GOAL_XP)
                .returning(DailyStats.user_id)
            )
            if flipped is not None:
                gained += DAILY_GOAL_XP
    return gained


def goal_met_today(session: Session, user_id: int) -> bool:
    return bool(
        session.scalar(
            select(DailyStats.goal_met).where(
                DailyStats.user_id == user_id, DailyStats.day == local_today()
            )
        )
    )


class Summary(BaseModel):
    xp_total: int
    xp_today: int
    words_today: int
    words_total: int
    texts_completed_total: int


def summary(session: Session, user_id: int) -> Summary:
    today = DailyStats.day == local_today()
    xp_total, xp_today, words_today, words_total, texts_completed_total = session.execute(
        select(
            func.coalesce(func.sum(DailyStats.xp), 0),
            func.coalesce(func.sum(DailyStats.xp).filter(today), 0),
            func.coalesce(func.sum(DailyStats.words_read).filter(today), 0),
            func.coalesce(func.sum(DailyStats.words_read), 0),
            func.coalesce(func.sum(DailyStats.texts_completed), 0),
        ).where(DailyStats.user_id == user_id)
    ).one()
    return Summary(
        xp_total=xp_total,
        xp_today=xp_today,
        words_today=words_today,
        words_total=words_total,
        texts_completed_total=texts_completed_total,
    )
