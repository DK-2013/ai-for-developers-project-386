# AGENTS.md

## Project Overview

Call booking app (learning project): one owner publishes meeting types and available slots; guests book a slot without auth. TypeScript monorepo: TypeSpec contract, `node:http` + Drizzle + PostgreSQL server, React + Vite web app. `README.md` (Russian) is the product description; this file is the operating contract for agents.

## Main rules

- Do not preserve backward compatibility.
- Choose the simplest implementation that fully meets the current requirements.
- Prefer established, well-maintained libraries over custom implementations.
- Fix the cause, not the symptom.
- Suggest best practices, even if they may require refactoring.

## Precedence

1. `packages/spec/main.tsp` — API shape.
2. `README.md` (`Rules`, `Checkpoints`) — product behavior.
3. `CODING_STANDARDS.md` — implementation rules.
4. Current task.

If two sources disagree, stop and report the conflict. Do not silently choose one.

## Current scaffold

The repository is an early scaffold, not the full product. Only `/healthz` exists in the contract; server routing is still handwritten; `web` has no app; migrations and the test database are not wired yet. Treat the rest of `README.md` as target behavior. If a task depends on a missing piece, say so instead of inventing an implementation.

## Structure

pnpm monorepo:

- `packages/spec` — TypeSpec contract (`main.tsp`).
- `packages/server` — `node:http`, Drizzle, PostgreSQL.
- `packages/web` — React, Vite.

## Contract and generated code

- `main.tsp` is the only source of truth for the API.
- Emitters run in parallel: `@typespec/openapi3` → `packages/spec/openapi.json`; `@typespec/http-server-js` → `packages/server/src/generated/`; `@typespec/http-client-js` → `packages/web/src/sdk/` (`@calendar/client`).
- `openapi.json`, `generated/`, and `sdk/` are generated and gitignored. Never edit them; change `main.tsp` and run `mise run codegen`.
- Do not hand-write wire DTOs that duplicate the contract. Map wire → domain → DB/view at the boundaries.
- `server` and `web` must not import each other. No circular imports. The generated SDK belongs to `web`; `server` uses its own generated types.

## Commands

- Setup once: `mise install`, then `mise run setup` (Postgres, dependencies, codegen, hk hooks). Setup does not run migrations.
- Develop: `mise run dev` — web :5173, API :3000, Vite proxies `/api`.
- Test: `mise run test` (starts Postgres). Single file: `pnpm --filter @calendar/server exec vitest run test/app.test.ts`.
- Full gate: `mise run check` = `mise run codegen` + `hk check --all` (oxlint, oxfmt, syncpack, hadolint, typos, agnix, vacuum, typecheck, depcruise, test, betterleaks, suppression-date check, jactionlint).
- Fast gate: `mise run check:fast` = `hk run pre-commit --staged --check`. It does not run `codegen`, `typecheck`, `depcruise`, or tests.
- Autofix: `mise run fix` = `hk fix --all` (oxlint + oxfmt). The pre-commit hook runs hk in fix mode over more steps and may rewrite and re-stage files; inspect the diff after it runs.
- Migrations: `pnpm db:generate` (Drizzle schema → SQL). Custom SQL is allowed only for the cases listed in `CODING_STANDARDS.md`.
- Pre-push runs `hk pre-push` (typecheck, depcruise, tests, security checks) but not `codegen`. Run `mise run check` before pushing.

## Hard rules

- Never edit generated or gitignored codegen output.
- Never add a second API client, router, or wire schema.
- Never use SQLite or mocked Drizzle for booking/overlap tests; use real PostgreSQL.
- Never use `sleep` in tests; inject a clock or use fake timers.
- Never disable a lint rule without the documented review-dated exception.
- Never write schema SQL by hand except the documented custom-migration cases.
- Never commit, push, force-push, or rewrite history unless asked. Rebase only your own branch.
- Do not delete or rename `.github/workflows/hexlet-check.yml`.
- Do not add dependencies or refactor unrelated code without a reason.

## Definition of Done

- [ ] API change: `main.tsp` updated and `mise run codegen` run; generated files not edited.
- [ ] Behavior change has a test; DB/concurrency change has an integration test.
- [ ] `mise run check` passes. If it cannot pass, report the exact failing step and error.
- [ ] Diff is scoped to the task; no unrelated formatting or generated files.
- [ ] New dependencies, migrations, and public API changes are called out explicitly.
- [ ] README updated if user-facing behavior changed.
- [ ] Commit message follows Conventional Commits if a commit was requested.

## Stop and ask

Stop and ask when a task requires:

- changing `main.tsp` or the public API;
- a schema change, migration, or destructive DB operation;
- a new dependency or a new package;
- changing a rule in this file or `CODING_STANDARDS.md`;
- resolving a conflict between sources;
- working around a failing check unrelated to the task.

## Conventions

- Formatter: `oxfmt`; linter: `oxlint --deny-warnings`.
- Commits: Conventional Commits; header, body, and footer lines ≤ 100 characters.
- History: linear, no merge commits.
- Language: README and user-facing docs in Russian; code, comments, agent docs, and commit messages in English.
- Details: `CODING_STANDARDS.md`.
