from logging.config import fileConfig

from alembic import context

import app.articles.models
import app.books.models
import app.gamification.models
import app.goals.models
import app.reading.models
import app.stats.models
import app.users.models
import app.vocabulary.models  # noqa: F401
from app.db import Base, engine

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=engine.url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # engine vem de app.db, que lê DATABASE_URL
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
