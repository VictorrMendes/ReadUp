# ReadUp

Aplicativo mobile para aprender inglês pelo hábito diário de leitura.

```text
readup/
├── mobile/            # React Native + Expo + TypeScript (próxima etapa)
├── backend/           # FastAPI (monólito modular)
├── storage/pdfs/      # PDFs enviados pelos usuários (fora do git)
└── docker-compose.yml # api + PostgreSQL
```

## Rodando

```sh
cp .env.example .env   # defina POSTGRES_PASSWORD (só letras e números) e JWT_SECRET
docker compose up -d --build
curl http://localhost:8000/health   # {"status":"ok"}
```

O PostgreSQL fica acessível apenas em `127.0.0.1:5433`.

## Testes do backend

Com o compose no ar:

```sh
cd backend
DATABASE_URL=postgresql+psycopg://readup:<senha>@127.0.0.1:5433/readup JWT_SECRET=<do .env> uv run pytest
uv run ruff check . && uv run mypy app tests
```

## Nova migração

```sh
cd backend
DATABASE_URL=... uv run alembic revision --autogenerate -m "..."
```

## Mobile

```sh
cp mobile/.env.example mobile/.env   # EXPO_PUBLIC_API_URL com o IP da máquina na LAN
cd mobile
npm install
npx expo start
npm test
```
