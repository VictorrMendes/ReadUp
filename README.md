# ReadUp

Aplicativo mobile para aprender inglês pelo hábito diário de leitura.

```text
readup/
├── mobile/            # Flutter (Dart) + BLoC, Clean Architecture por feature
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
- **Ofensiva (streak)**: dias consecutivos com o mínimo do dia (50 palavras lidas) e recorde histórico. Meta batida ganha a chama dourada. 2 escudos cobrem dias em branco sozinhos (1 volta a cada 7 dias de ofensiva, máximo 2). No app, a ofensiva pode ser escondida no Perfil.
- **Conquistas (achievements)**: medalhas desbloqueadas automaticamente por marcos de leitura, ofensiva e vocabulário.
- **Vocabulário com tradução**: consulta instantânea de palavras via MyMemory com cache global e lista pessoal de palavras salvas.
- **Revisão espaçada**: palavras salvas voltam em cartões (caixas de Leitner: 1, 3, 7, 14, 30 e 90 dias), até 20 respostas por dia e +2 XP por acerto (teto de 20 XP/dia).
- **Lembrete diário**: notificação local (manhã, tarde ou noite), sem servidor, escolhida no onboarding ou no Perfil. A permissão só é pedida nessa escolha; o lembrete do dia sai quando a meta ou o mínimo da ofensiva já foi feito, e sair da conta cancela todos.
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

App em **Flutter** (Dart) com `flutter_bloc`, Clean Architecture organizada por feature
(`lib/features/<feature>/{domain,presentation}`), `core/` (HTTP, exceções, rotas, storage) e
`design_system/` (cores, tipografia, espaços, tema Material 3, motion).

Regras do projeto:

- Tela → BLoC → Repositório: telas nunca chamam repositórios.
- Repositórios usam só o `HttpHelper` (nunca `package:http` direto) e envolvem tudo em
  `repositoryExceptionHandlerScope`, que entrega `RequestFailure` ao BLoC.
- Texto pelo `Theme.of(context).textTheme`; estilos de leitura por `context.readupText`.
- Widgets auxiliares são classes próprias (nada de `_buildX()` que devolve widget).
- Dependências por construtor (`RepositoryProvider`/`BlocProvider` na raiz), sem singletons:
  nos testes, tudo vira mock pelo `wrapApp` de `test/fakes/harness.dart`.

```text
lib/
├── core/           # HttpHelper, exceções, rotas, extensões, serviços do aparelho (voz, PDF, lembretes)
├── design_system/  # cores, tipografia, espaços, motion e tema
├── shared/         # modelos, repositórios e widgets usados por mais de uma feature
└── features/       # auth, onboarding, home, home_tabs, read, reader, vocabulary, review, profile
```

### Execução

A URL da API vai por `--dart-define`. No emulador Android, `10.0.2.2` é o seu computador (padrão do
entrypoint de dev); no celular físico, use o IP da máquina na rede local.

```sh
cd mobile
flutter pub get
flutter run -t lib/main_dev.dart --dart-define=API_URL=http://192.168.0.10:8000
```

Build de produção: `flutter build apk -t lib/main_prod.dart --dart-define=API_URL=https://...`
(o build Android pede Java 17+). Sem as variáveis `ANDROID_KEYSTORE_*` (abaixo), o release é
assinado com a chave de debug.

### APK pelo GitHub Actions

O workflow `Android` (`.github/workflows/android.yml`) gera um APK de release a cada PR para
`master` ou `homolog` que mexa em `mobile/` e comenta o link de download no PR. O merge cria uma
Release com o APK: `vX.Y.Z-N` na `master` e pré-release `homolog-vX.Y.Z-N` na `homolog`.

Configuração (uma vez, em *Settings* do repositório):

1. *Environments*: crie `production` e `homolog`, cada um com a variável `API_URL`. Em `production`,
   só HTTPS; em `homolog` vale `http://` (ex.: a API na rede local, `http://192.168.1.22:8000`), e
   só o APK de homolog aceita HTTP.
2. Chave de assinatura, para cada APK novo instalar por cima do anterior (sem ela, é preciso
   desinstalar antes):

   ```sh
   keytool -genkey -v -keystore readup-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias readup
   base64 -w0 readup-release.jks   # vira o secret ANDROID_KEYSTORE_BASE64
   ```

   *Secrets and variables → Actions*: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS` (`readup`) e `ANDROID_KEY_PASSWORD`. Guarde o `.jks` fora do repositório e
   com backup: sem ele, nenhuma versão futura atualiza o app instalado (nem na loja).

HTTP sem TLS só é aceito no build de debug e no APK de homolog do Android (placeholder
`usesCleartextTraffic` em `android/app/build.gradle.kts`) e, no iOS, só para a rede local;
produção usa HTTPS.

### Testes e validações do mobile

```sh
cd mobile
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
```
