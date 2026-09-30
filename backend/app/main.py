from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.articles.router import router as articles_router
from app.auth.router import router as auth_router
from app.books.router import UploadSizeLimit
from app.books.router import router as books_router
from app.db import get_session
from app.goals.router import router as goals_router
from app.reading.router import router as reading_router
from app.stats.router import router as stats_router
from app.users.router import router as users_router
from app.vocabulary.router import router as vocabulary_router

app = FastAPI(title="ReadUp API")
app.add_middleware(UploadSizeLimit)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(articles_router)
app.include_router(reading_router)
app.include_router(goals_router)
app.include_router(stats_router)
app.include_router(vocabulary_router)
app.include_router(books_router)


@app.get("/health")
def health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}
