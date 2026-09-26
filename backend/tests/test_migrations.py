from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import engine
from app.users.models import User

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
TABLES = {
    "users",
    "reading_goals",
    "articles",
    "reading_progress",
    "saved_words",
    "daily_stats",
    "streaks",
}


@pytest.fixture(scope="module", autouse=True)
def upgrade_head() -> None:
    command.upgrade(Config(str(ALEMBIC_INI)), "head")


def test_upgrade_head_creates_tables() -> None:
    assert TABLES <= set(inspect(engine).get_table_names())


def test_duplicate_email_is_rejected() -> None:
    with Session(engine) as session:
        session.add(User(name="A", email="dup@example.com", password_hash="x"))
        session.flush()
        session.add(User(name="B", email="dup@example.com", password_hash="x"))
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()
