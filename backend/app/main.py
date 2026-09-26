from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.articles.router import router as articles_router
from app.auth.router import router as auth_router
from app.db import get_session
from app.reading.router import router as reading_router
from app.users.router import router as users_router

app = FastAPI(title="ReadUp API")
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(articles_router)
app.include_router(reading_router)


@app.get("/health")
def health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}
