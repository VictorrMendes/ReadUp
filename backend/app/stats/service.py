import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.articles.models import Article
from app.books.models import Book
from app.gamification.achievements import Metrics
from app.gamification.models import Streak
from app.gamification.streak import MIN_STREAK_WORDS, effective_streak, next_streak
from app.gamification.xp import DAILY_GOAL_XP, completion_xp, xp_for_words
from app.goals.service import active_target
from app.reading.models import ReadingProgress
from app.stats.models import DailyStats
from app.vocabulary.models import SavedWord

# ponytail: fuso único; fuso por usuário quando houver usuários fora do Brasil
APP_TIMEZONE = ZoneInfo(os.environ.get("APP_TIMEZONE", "America/Sao_Paulo"))


def local_today(now: datetime | None = None) -> date:
    """Dia local do app; `now` (com fuso) permite fixar o instante."""
    return (now or datetime.now(APP_TIMEZONE)).astimezone(APP_TIMEZONE).date()


def _count_streak_day(session: Session, user_id: int, today: date) -> None:
    """Conta `today` na ofensiva. Cria a linha se preciso e a trava até o commit."""
    session.execute(insert(Streak).values(user_id=user_id).on_conflict_do_nothing())
    streak = session.scalars(
        select(Streak).where(Streak.user_id == user_id).with_for_update()
    ).one()
    streak.current, streak.longest, streak.freezes = next_streak(
        streak.current, streak.longest, streak.freezes, streak.last_active_day, today
    )
    streak.last_active_day = today


def _goal_bonus(session: Session, user_id: int, today: date, words_today: int) -> int:
    """Vira a marca da meta do dia se as palavras de hoje cumprem a meta ativa: +50 XP (a chama
    dourada). Só quem vira a marca ganha (uma vez por dia). Devolve o XP ganho. A ofensiva já
    contou o dia antes: a menor meta é MIN_STREAK_WORDS."""
    target = active_target(session, user_id)
    if target is None or words_today < target:
        return 0
    flipped = session.scalar(
        update(DailyStats)
        .where(DailyStats.user_id == user_id, DailyStats.day == today, ~DailyStats.goal_met)
        .values(goal_met=True, xp=DailyStats.xp + DAILY_GOAL_XP)
        .returning(DailyStats.user_id)
    )
    return 0 if flipped is None else DAILY_GOAL_XP


def settle_goal(session: Session, user_id: int) -> int:
    """Depois de mudar a meta: se as palavras de hoje já cumprem a nova meta, vira a marca
    (mesma regra do registro de leitura). Devolve o XP ganho."""
    today = local_today()
    words_today = session.scalar(
        select(DailyStats.words_read)
        .where(DailyStats.user_id == user_id, DailyStats.day == today, ~DailyStats.goal_met)
        .with_for_update()
    )
    return 0 if words_today is None else _goal_bonus(session, user_id, today, words_today)


def add_daily_activity(
    session: Session, user_id: int, words: int, seconds: int, completed_words: int | None
) -> int:
    """Soma a atividade no dia local do usuário (upsert) e devolve o XP ganho nesta chamada.

    `completed_words`: tamanho do texto concluído nesta chamada (None se nenhum). Nada a
    somar → não cria linha.
    """
    texts_completed = int(completed_words is not None)
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

    # mínimo do dia: conta a ofensiva uma vez, no envio que cruza o limite (linha do dia travada)
    if words_today - words < MIN_STREAK_WORDS <= words_today:
        _count_streak_day(session, user_id, today)

    gained = xp_for_words(words_today - words, words_today)
    if completed_words is not None:
        gained += completion_xp(completed_words)
    if gained:
        session.execute(update(DailyStats).where(row).values(xp=DailyStats.xp + gained))

    if not goal_met:
        gained += _goal_bonus(session, user_id, today, words_today)
    return gained


def goal_met_today(session: Session, user_id: int) -> bool:
    return bool(
        session.scalar(
            select(DailyStats.goal_met).where(
                DailyStats.user_id == user_id, DailyStats.day == local_today()
            )
        )
    )


class StreakStatus(BaseModel):
    streak_current: int  # efetiva: 0 se quebrou
    streak_longest: int
    streak_active_today: bool  # mínimo do dia feito
    streak_freezes: int  # escudos restantes (0 com a ofensiva quebrada)


def streak_status(session: Session, user_id: int) -> StreakStatus:
    today = local_today()
    streak = session.get(Streak, user_id)
    if streak is None:
        return StreakStatus(
            streak_current=0, streak_longest=0, streak_active_today=False, streak_freezes=0
        )
    current, freezes = effective_streak(
        streak.current, streak.freezes, streak.last_active_day, today
    )
    return StreakStatus(
        streak_current=current,
        streak_longest=streak.longest,
        streak_active_today=streak.last_active_day == today,
        streak_freezes=freezes,
    )


class Summary(StreakStatus):
    xp_total: int
    xp_today: int
    words_today: int
    words_total: int
    texts_completed_total: int
    minutes_total: int  # soma dos segundos de leitura / 60, para baixo
    words_saved_total: int
    books_started: int  # livros com algum capítulo com progresso > 0
    books_completed: int  # livros com todos os capítulos concluídos


def _books_progress(session: Session, user_id: int) -> tuple[int, int]:
    """(iniciados, concluídos) dos livros do usuário, numa query (agregado por livro)."""
    per_book = (
        select(
            func.bool_or(ReadingProgress.progress > 0).label("started"),
            (func.count(Article.id) == func.count(ReadingProgress.completed_at)).label("completed"),
        )
        .select_from(Book)
        .join(Article, Article.book_id == Book.id)
        .outerjoin(
            ReadingProgress,
            (ReadingProgress.article_id == Article.id) & (ReadingProgress.user_id == user_id),
        )
        .where(Book.user_id == user_id)
        .group_by(Book.id)
        .subquery()
    )
    started, completed = session.execute(
        select(
            func.count().filter(per_book.c.started.is_(True)),
            func.count().filter(per_book.c.completed),
        )
    ).one()
    return started, completed


def summary(session: Session, user_id: int) -> Summary:
    today = DailyStats.day == local_today()
    saved = (
        select(func.count()).select_from(SavedWord).where(SavedWord.user_id == user_id)
    ).scalar_subquery()
    (
        xp_total,
        xp_today,
        words_today,
        words_total,
        texts_completed_total,
        seconds_total,
        words_saved_total,
    ) = session.execute(
        select(
            func.coalesce(func.sum(DailyStats.xp), 0),
            func.coalesce(func.sum(DailyStats.xp).filter(today), 0),
            func.coalesce(func.sum(DailyStats.words_read).filter(today), 0),
            func.coalesce(func.sum(DailyStats.words_read), 0),
            func.coalesce(func.sum(DailyStats.texts_completed), 0),
            func.coalesce(func.sum(DailyStats.seconds_read), 0),
            saved,
        ).where(DailyStats.user_id == user_id)
    ).one()
    books_started, books_completed = _books_progress(session, user_id)
    return Summary(
        xp_total=xp_total,
        xp_today=xp_today,
        words_today=words_today,
        words_total=words_total,
        texts_completed_total=texts_completed_total,
        minutes_total=seconds_total // 60,
        words_saved_total=words_saved_total,
        books_started=books_started,
        books_completed=books_completed,
        **streak_status(session, user_id).model_dump(),
    )


def achievement_metrics(session: Session, user_id: int) -> Metrics:
    """Métricas das conquistas (só crescem) numa query: somas de daily_stats + maior ofensiva."""
    longest = select(Streak.longest).where(Streak.user_id == user_id).scalar_subquery()
    words, texts, goal_days, longest_streak = session.execute(
        select(
            func.coalesce(func.sum(DailyStats.words_read), 0),
            func.coalesce(func.sum(DailyStats.texts_completed), 0),
            func.count().filter(DailyStats.goal_met),
            func.coalesce(longest, 0),
        ).where(DailyStats.user_id == user_id)
    ).one()
    return Metrics(
        words_total=words,
        texts_completed=texts,
        goal_days=goal_days,
        longest_streak=longest_streak,
    )


class DailyPoint(BaseModel):
    day: date
    words_read: int
    xp: int
    goal_met: bool
    streak_kept: bool  # mínimo do dia feito


def daily(session: Session, user_id: int, days: int) -> list[DailyPoint]:
    """Últimos `days` dias locais, do mais antigo para hoje; dia sem atividade vem zerado."""
    today = local_today()
    first = today - timedelta(days=days - 1)
    rows = {
        row.day: row
        for row in session.execute(
            select(DailyStats.day, DailyStats.words_read, DailyStats.xp, DailyStats.goal_met).where(
                DailyStats.user_id == user_id, DailyStats.day.between(first, today)
            )
        )
    }
    points = []
    for offset in range(days):
        day = first + timedelta(days=offset)
        row = rows.get(day)
        points.append(
            DailyPoint(
                day=day,
                words_read=row.words_read,
                xp=row.xp,
                goal_met=row.goal_met,
                streak_kept=row.words_read >= MIN_STREAK_WORDS,
            )
            if row
            else DailyPoint(day=day, words_read=0, xp=0, goal_met=False, streak_kept=False)
        )
    return points
