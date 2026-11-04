# Календарь звонков

[![hexlet-check](https://github.com/DK-2013/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/DK-2013/ai-for-developers-project-386/actions)

Учебное приложение для бронирования встреч.  
Организатор публикует доступные интервалы, гость выбирает свободный слот и записывается на звонок.  
Функциональность намеренно ограничена:  
один владелец календаря, без авторизации и внешних интеграций.

> **Статус:** учебный каркас. Контракт описывает все операции спецификации, но поведение пока есть только у `GET /healthz`: остальные маршруты подключены к сгенерированному роутеру с заглушками. Правила работы с репозиторием — в `AGENTS.md`.

## Спецификация

Продуктовое поведение — роли, сценарии, правила бронирования и контрольные точки — описано в [`docs/SPEC.md`](docs/SPEC.md).

## Стек

Приложение собирается в Docker-образ и запускается в контейнере. TypeScript на всех слоях. Design First: один контракт TypeSpec, из него генерируются OpenAPI-спецификация, серверный роутер и клиентский SDK.

| Слой | Выбор |
|---|---|
| Контракт | TypeSpec (`@typespec/http`, `@typespec/openapi3`) |
| Спецификация | OpenAPI 3, эмиттер `@typespec/openapi3` |
| Серверные маршруты и типы | `@typespec/http-server-js` |
| HTTP | Node.js 22, встроенный `http` |
| Клиентский SDK | `@typespec/http-client-js` |
| База | PostgreSQL 16 |
| Доступ к данным | Drizzle |
| Фронтенд | Vite, React, TypeScript, React Router, TanStack Query |
| UI | shadcn/ui |
| Стили | Tailwind |
| Тесты | Vitest |
| Пакеты | pnpm workspaces: `spec`, `server`, `web` |
| Локальная база | Docker Compose |
| Toolchain | mise |

## Архитектура

```text
.
├── mise.toml                  # версии Node/pnpm и задачи
├── docker-compose.yml         # PostgreSQL + приложение
├── packages/
│   ├── spec/                  # TypeSpec-контракт и генерация
│   │   └── main.tsp
│   ├── server/                # API на node:http, Drizzle
│   │   ├── drizzle/           # SQL-миграции
│   │   ├── src/generated/     # генерируется из TypeSpec (в git не хранится)
│   │   └── test/
│   └── web/                   # React-приложение
│       └── src/sdk/           # сгенерированный клиентский SDK (в git не хранится)
└── Dockerfile
```

`pnpm codegen` запускает TypeSpec и создаёт:

- `packages/spec/openapi.json` — OpenAPI 3;
- `packages/server/src/generated/` — типы, сериализацию и Node.js-роутер;
- `packages/web/src/sdk/` — типизированный клиент API.

Слоты не хранятся в базе. Рабочие часы заданы конфигом, свободные интервалы вычисляются на лету с учётом уже созданных броней. Время в PostgreSQL хранится в `timestamptz` (UTC), а «сегодня» и рабочие часы считаются в таймзоне владельца.

Защита от гонок и наложений обеспечена ограничением PostgreSQL:

```sql
EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)
```

Поэтому два одновременных запроса на один слот не могут оба завершиться успешно: второй `INSERT` получает ошибку `23P01`, которую API превращает в `409 Conflict`.

### API

Список операций, формат времени и семантика ошибок — в разделе «API» [`docs/SPEC.md`](docs/SPEC.md); контракт — `packages/spec/main.tsp`.

## Установка

Понадобятся [mise](https://mise.jdx.dev/), Docker и Docker Compose.

```bash
git clone https://github.com/DK-2013/ai-for-developers-project-386.git
cd ai-for-developers-project-386

mise install          # Node 22 и pnpm 10
mise run setup        # PostgreSQL, зависимости, codegen, git-hooks
```

`mise run setup` поднимает PostgreSQL в Docker, устанавливает зависимости, генерирует код из TypeSpec и устанавливает git-hooks.

## Использование

```bash
mise run dev
```

- Публичная страница записи: <http://localhost:5173>
- Кабинет владельца: <http://localhost:5173/owner>
- Проверка живости API: <http://localhost:3000/healthz>

Vite проксирует `/api` на сервер и убирает префикс `/api`, поэтому в development фронтенд и API работают с одного origin.

Полезные задачи:

```bash
mise run codegen      # перегенерировать OpenAPI, роутер и SDK
mise run db:up        # поднять PostgreSQL вручную
mise run test         # unit + интеграционные тесты
mise run build        # собрать сервер и фронтенд
mise run docker:up    # собрать и запустить всё в Docker
```

`mise run test`, `mise run check` и `mise run dev` сами поднимают PostgreSQL через mise-демон `db` и переиспользуют уже запущенный. Остановить базу — `mise daemons stop db` (или `mise run db:down`, чтобы удалить контейнеры).

## Переменные окружения

Значения по умолчанию заданы и проверяются в `packages/server/src/config.ts`. Для локального переопределения скопируйте `.env.example` в `.env`: сервер загружает этот файл при старте, а его отсутствие — норма.

Приоритет источников: переменные окружения процесса → `.env` → значения по умолчанию. Невалидное значение останавливает запуск и выводит список всех проблем сразу.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/call_calendar` | Подключение к PostgreSQL |
| `PORT` | `3000` | Порт API |
| `OWNER_TIMEZONE` | `Europe/Moscow` | Таймзона владельца |
| `WORKING_HOURS_START` | `10:00` | Начало рабочего дня |
| `WORKING_HOURS_END` | `18:00` | Конец рабочего дня |
| `WORKING_DAYS` | `1,2,3,4,5` | ISO-дни недели (1 — понедельник) |

Горизонт бронирования (14 дней) и шаг слотов (15 минут) зафиксированы в `docs/SPEC.md` и вынесены в константы `packages/server/src/domain/booking-rules.ts`; переменными окружения они не настраиваются.

В контейнере `docker compose` порт фиксирован на `3000`, а `DATABASE_URL` указывает на сервис `db`; остальные значения можно переопределить через `.env`.

## Тесты

```bash
mise run test
```

- smoke-test web заглушки

## Релизы

Версионируется только корневой пакет `call-calendar`: релиз — это тег `vX.Y.Z`, GitHub Release и `CHANGELOG.md` в корне. Пакеты `@calendar/*` остаются `private` с версией `0.0.0`: они не публикуются и отдельно не версионируются. Решение зафиксировано в [ADR 0005](docs/adr/0005-release-versioning.md).

Релизы готовит [release-please](https://github.com/googleapis/release-please). Workflow `.github/workflows/release-please.yml` запускается на push в `main`, читает Conventional Commits и открывает или обновляет release PR `chore(main): release X.Y.Z`. PR меняет только версию в корневом `package.json` и `CHANGELOG.md`; вручную их не правят. Мерж release PR (squash или rebase, без merge-коммита) создаёт тег `vX.Y.Z` и GitHub Release.

До версии `1.0.0` включён `bump-minor-pre-major`: breaking change (`!` или `BREAKING CHANGE`) повышает minor, а не major. `feat` повышает minor, `fix` и `perf` — patch. Первый релиз — `0.1.0` (`initial-version`), и его release PR соберёт всю историю, потому что тегов ещё нет; дальше в CHANGELOG попадают только новые коммиты.

Workflow запрашивает `contents: write`, `issues: write` и `pull-requests: write`; остальные workflow свои права не меняют. В настройках репозитория должно быть разрешено создание PR из Actions: *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests*. Release PR, созданные встроенным `GITHUB_TOKEN`, не запускают `quality` и `hexlet-check`. Если проверки на release PR нужны, добавьте секрет `RELEASE_PLEASE_TOKEN` — fine-grained PAT с доступом к contents и pull requests; workflow использует его вместо `github.token`.

## Docker

```bash
mise run docker:up
```

API будет доступен на <http://localhost:3000>. Внутри образа выполняется многоступенчатая сборка: генерация кода, сборка фронтенда и сервера, затем production-зависимости и запуск `node server/dist/index.js`. В целевом образе миграции применяются при старте контейнера.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
