import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.books.models  # noqa: F401 — rodado sozinho (python -m): articles.book_id → books
import app.users.models  # noqa: F401 — books.user_id → users
from app.articles.models import Article
from app.articles.text import count_words
from app.db import engine

SEED_FILE = Path(__file__).with_name("seed_articles.json")
SOURCE = "ReadUp"


def seed(session: Session) -> int:
    """Insere os textos do JSON que ainda não existem (por title + source). Retorna quantos."""
    existing = set(session.scalars(select(Article.title).where(Article.source == SOURCE)))
    new = [
        Article(
            title=item["title"],
            content=item["content"],
            category=item["category"],
            difficulty=item["level"],
            word_count=count_words(item["content"]),
            source=SOURCE,
        )
        for item in json.loads(SEED_FILE.read_text(encoding="utf-8"))
        if item["title"] not in existing
    ]
    session.add_all(new)
    session.commit()
    return len(new)


if __name__ == "__main__":
    with Session(engine) as session:
        print(f"{seed(session)} textos inseridos")
