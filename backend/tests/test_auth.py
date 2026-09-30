import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.security import JWT_SECRET
from app.db import engine
from app.main import app
from app.users.models import User

client = TestClient(app)
PASSWORD = "correct-horse"


@pytest.fixture
def email() -> Iterator[str]:
    address = f"test-{uuid.uuid4().hex}@example.com"
    yield address
    with Session(engine) as session:
        session.execute(delete(User).where(User.email == address))
        session.commit()


def register(email: str, password: str = PASSWORD) -> str:
    response = client.post(
        "/auth/register", json={"name": " Ana ", "email": email, "password": password}
    )
    assert response.status_code == 201
    token: str = response.json()["access_token"]
    return token


def stored_user(email: str) -> User:
    with Session(engine) as session:
        user = session.scalar(select(User).where(User.email == email))
    assert user is not None
    return user


def test_register_normalizes_email_and_hashes_password(email: str) -> None:
    response = client.post(
        "/auth/register",
        json={"name": " Ana ", "email": f"  {email.upper()} ", "password": PASSWORD},
    )

    assert response.status_code == 201
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]
    user = stored_user(email)
    assert user.name == "Ana"
    assert user.password_hash.startswith("$argon2")
    assert PASSWORD not in user.password_hash


def test_register_duplicate_email_is_conflict(email: str) -> None:
    register(email)

    response = client.post(
        "/auth/register", json={"name": "B", "email": email.upper(), "password": PASSWORD}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email já cadastrado"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "A", "email": "short@example.com", "password": "1234567"},
        {"name": "A", "email": "not-an-email", "password": PASSWORD},
    ],
)
def test_register_invalid_input_is_422(payload: dict[str, str]) -> None:
    assert client.post("/auth/register", json=payload).status_code == 422


def test_login(email: str) -> None:
    register(email)

    ok = client.post("/auth/login", json={"email": email.upper(), "password": PASSWORD})
    wrong = client.post("/auth/login", json={"email": email, "password": "wrong-password"})
    unknown = client.post("/auth/login", json={"email": f"x{email}", "password": PASSWORD})

    assert ok.status_code == 200
    assert ok.json()["access_token"]
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Email ou senha inválidos"}


def test_me_with_token(email: str) -> None:
    token = register(email)

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"id", "name", "email", "english_level", "created_at", "daily_goal"}
    assert body["email"] == email


def test_me_rejects_bad_tokens(email: str) -> None:
    register(email)
    expired = jwt.encode(
        {"sub": str(stored_user(email).id), "exp": datetime.now(UTC) - timedelta(minutes=1)},
        JWT_SECRET,
        algorithm="HS256",
    )

    for headers in (
        {},
        {"Authorization": "Bearer invalid"},
        {"Authorization": f"Bearer {expired}"},
    ):
        response = client.get("/users/me", headers=headers)
        assert response.status_code == 401
        assert response.json() == {"detail": "Não autenticado"}
        assert response.headers["www-authenticate"] == "Bearer"
