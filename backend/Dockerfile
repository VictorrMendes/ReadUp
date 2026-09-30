FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# uid fixo: é o dono esperado de ./storage/pdfs montado pelo compose em hosts Linux
RUN useradd --create-home --uid 1000 readup \
    && mkdir -p /app/storage/pdfs && chown readup /app/storage/pdfs
USER readup

EXPOSE 8000
CMD ["sh", "-c", "/app/.venv/bin/alembic upgrade head && exec /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000"]
