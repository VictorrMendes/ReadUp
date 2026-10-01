# ReadUp

Aplicativo mobile para aprender inglês pelo hábito diário de leitura.

```text
readup/
├── mobile/            # React Native + Expo SDK 57 + Expo Router + TypeScript
├── backend/           # FastAPI (monólito modular em backend/app/*)
├── storage/pdfs/      # PDFs privados enviados pelos usuários (fora do git)
└── docker-compose.yml # api (FastAPI) + db (PostgreSQL 17)
```

## Funcionalidades da V1

- **Conta e onboarding**: cadastro e login com JWT, escolha de nível de proficiência e meta diária de leitura.
- **Feed de textos e leitor**: catálogo de textos graduados por nível com interface dedicada para leitura.
- **Progresso validado por tempo**: registro de leitura e palavras lidas com validação contra leitura apressada/falsa.
- **Meta diária**: acompanhamento diário do progresso de leitura em relação à meta definida.
- **XP**: acúmulo de pontos de experiência por leituras concluídas e metas batidas.
- **Ofensiva (streak)**: contagem de dias consecutivos atingindo a meta de leitura e recorde histórico.
- **Conquistas (achievements)**: medalhas desbloqueadas automaticamente por marcos de leitura, ofensiva e vocabulário.
- **Vocabulário com tradução**: consulta instantânea de palavras via MyMemory com cache global e lista pessoal de palavras salvas.
- **PDFs privados**: envio de livros e documentos em PDF pelo usuário, processados em capítulos privados.
- **Notícias**: agregação periódica de artigos de fontes em inglês simples (VOA Learning English e Wikinews — ambas as fontes estão congeladas/modo arquivo).
- **Estatísticas no Perfil**: visão geral de palavras lidas, ofensiva, tempo de leitura e vocabulário acumulado.

## Variáveis de ambiente

Configuradas no arquivo `.env` na raiz do projeto (baseado em `.env.example`):

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Sim | Senha do banco PostgreSQL. Use apenas letras e números (a senha entra diretamente na URL de conexão). |
| `JWT_SECRET` | Sim | Chave secreta para assinatura dos tokens JWT. Gere com: `python -c "import secrets;print(secrets.token_urlsafe(48))"`. |
| `MYMEMORY_EMAIL` | Não | E-mail de contato do responsável pelo app para a API do MyMemory (aumenta o limite diário gratuito de 5 mil para 50 mil caracteres). Nunca use o e-mail de um usuário. |
| `NEWS_FETCH_HOURS` | Não | Intervalo em horas entre coletas automáticas de notícias na API (padrão `6`; use `0` para desativar). |
| `NEWS_CONTACT` | Não | URL ou e-mail de contato do dono do app no `User-Agent` para a política da Wikimedia (evita throttling para 1 página a cada 7 s no Wikinews). Nunca use o e-mail de um usuário. |
| `PDF_STORAGE_DIR` | Não | Diretório de armazenamento de PDFs. Configurado no `docker-compose.yml` como `/app/storage/pdfs` (montado a partir de `./storage/pdfs` no host). |

## Rodando

```sh
cp .env.example .env   # defina POSTGRES_PASSWORD e JWT_SECRET
docker compose up -d --build
curl http://localhost:8000/health   # {"status":"ok"}
docker compose exec api python -m app.articles.seed   # textos iniciais (idempotente)
docker compose exec api python -m app.news.fetch      # busca manual de notícias
```

O PostgreSQL fica acessível no host apenas em `127.0.0.1:5433`.

### Armazenamento de PDFs

A pasta `storage/pdfs/` é montada no container da API, que roda com usuário não-root `readup` (`uid 1000`, conforme `backend/Dockerfile`). Em hosts Linux, certifique-se de que a pasta local seja gravável por esse UID:

```sh
chown -R 1000:1000 storage/pdfs
```

## Testes e validações do backend

Com o compose no ar:

```sh
cd backend
DATABASE_URL=postgresql+psycopg://readup:<senha>@127.0.0.1:5433/readup JWT_SECRET=<do .env> uv run pytest
DATABASE_URL=postgresql+psycopg://readup:<senha>@127.0.0.1:5433/readup uv run alembic check
uv run ruff check . && uv run mypy app tests
```

## Nova migração

```sh
cd backend
DATABASE_URL=postgresql+psycopg://readup:<senha>@127.0.0.1:5433/readup uv run alembic revision --autogenerate -m "..."
```

## Mobile

O aplicativo mobile utiliza Expo SDK 57 com Expo Router e TypeScript.

### Configuração

1. Crie o arquivo de ambiente:
   ```sh
   cp mobile/.env.example mobile/.env
   ```
2. Defina `EXPO_PUBLIC_API_URL` com o IP da sua máquina na rede local (LAN), por exemplo:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
   ```
   > **Nota:** Não utilize `localhost`, pois no celular físico ou emulador ele apontará para o próprio aparelho. Se o roteador reiniciar e o IP da sua máquina mudar, atualize o `mobile/.env` e reinicie o bundler limpando o cache: `npx expo start -c`.

### Execução

```sh
cd mobile
npm install
npx expo start
```

Abra o aplicativo **Expo Go** no celular e escaneie o QR code gerado no terminal. O celular e o computador devem estar na **mesma rede Wi-Fi**.

### Testes e validações do mobile

```sh
cd mobile
npx tsc --noEmit
npx expo lint
npm test
npx expo-doctor
```
