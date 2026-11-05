# AGENTS.md

## Project Overview

Call booking app (learning project): one owner publishes meeting types and available slots; guests book a slot without auth. TypeScript monorepo: TypeSpec contract, `node:http` + Drizzle + PostgreSQL server, React + Vite web app. `docs/SPEC.md` (Russian) is the product specification; this file is the operating contract for agents.

## Main rules

- Do not preserve backward compatibility.
- Choose the simplest implementation that fully meets the current requirements.
- Prefer established, well-maintained libraries over custom implementations.
- Fix the cause, not the symptom.
- Suggest best practices, even if they may require refactoring.

## Precedence

1. `packages/spec/main.tsp` — API shape.
2. `docs/SPEC.md` — product behavior.
3. `CODING_STANDARDS.md` — implementation rules.
4. Current task.

If two sources disagree, stop and report the conflict. Do not silently choose one.

## Current scaffold

The repository is an early scaffold, not the full product. The contract declares every operation listed in `docs/SPEC.md`. Implemented: `GET /healthz`, `GET /meeting-types`, `POST /meeting-types` with boundary validation, `GET /meeting-types/{id}/slots` backed by the pure slot engine and owner-local time module, and `POST /bookings` with boundary validation, the shared bookability rules, and the database exclusion constraint mapped to `409`; `GET /bookings` listing upcoming bookings across all meeting types ordered by start; migrations for both tables including the `bookings_no_overlap` GiST exclusion constraint; a startup seed of one default meeting type; the typed owner config (time zone, working hours/days); the spec-fixed booking-rules constants (14-day horizon, 15-minute step). `web` has the meeting types page, the owner meeting-type form and upcoming-bookings list, and the guest booking flow: free slots grouped in the browser time zone, slot selection, name and e-mail form, conflict message, and success state. Treat the rest of `docs/SPEC.md` as target behavior. If a task depends on a missing piece, say so instead of inventing an implementation.

## Structure

pnpm monorepo:

- `packages/spec` — TypeSpec contract (`main.tsp`).
- `packages/server` — `node:http`, Drizzle, PostgreSQL.
- `packages/web` — React, Vite.

## Contract and generated code

- `main.tsp` is the only source of truth for the API.
- Emitters run in parallel: `@typespec/openapi3` → `packages/spec/openapi.json`; `@typespec/http-server-js` → `packages/server/src/generated/`; `@typespec/http-client-js` → `packages/web/src/sdk/` (`@calendar/sdk`).
- `openapi.json`, `generated/`, and `sdk/` are generated and gitignored. Never edit them; change `main.tsp` and run `mise run codegen`.
- Do not hand-write wire DTOs that duplicate the contract. Map wire → domain → DB/view at the boundaries.
- `server` and `web` must not import each other. No circular imports. The generated SDK belongs to `web`; `server` uses its own generated types.

## Commands

- Setup once: `mise install`, then `mise run setup` (Postgres, dependencies, codegen, hk hooks). Setup does not run migrations.
- Develop: `mise run dev` — web :5173, API :3000, Vite proxies `/api`.
- Test: `mise run test` (starts Postgres). Single file: `pnpm --filter @calendar/server exec vitest run test/app.test.ts`.
- Browser install: `mise run mcp:browsers` installs the Chromium builds used by Playwright Test and the browser MCP servers.
- Browser diagnostics: `mise run mcp:check` verifies that both browser MCP servers initialize, launch a browser, and expose tools.
- Full gate: `mise run check` = `mise run codegen` + `hk check --all` (oxlint, oxfmt, syncpack, hadolint, typos, rumdl, agnix, vacuum, knip, typecheck, depcruise, test, betterleaks, suppression-date check, jactionlint). PostgreSQL starts through the `db:up` task dependency (`docker compose up -d --wait db`, compose project pinned to `call-calendar`), reusing an already-running container; stop it with `mise run db:down`. CI provides PostgreSQL as a service and runs `mise run --skip-deps check`, which skips the db and codegen dependencies.
- Fast gate: `mise run check:fast` = `hk run pre-commit --staged --check`. It does not run `codegen`, `typecheck`, `depcruise`, or tests.
- Autofix: `mise run fix` = `hk fix --all` (oxlint + oxfmt + rumdl). The pre-commit hook runs hk in fix mode over more steps and may rewrite and re-stage files; inspect the diff after it runs.
- Vulnerabilities: `mise run check:osv` scans lockfiles against the OSV database. It runs on the weekly `security` workflow, not in `mise run check`, because a new advisory can fail it without a change on our side.
- Migrations: `pnpm db:generate` (Drizzle schema → SQL). Custom SQL is allowed only for the cases listed in `CODING_STANDARDS.md`.
- Pre-push runs `hk pre-push` (typecheck, depcruise, tests, security checks) but not `codegen`. Run `mise run check` before pushing.

## Browser verification

- Start the app with `mise run dev` (web :5173, API :3000) before checking the UI in a browser.
- Playwright MCP: navigation, clicking, form filling, and page snapshots.
- Chrome DevTools MCP: console messages, network requests, and performance traces.
- Follow the [browser checks](docs/agents/browser-checks.md) checklist for expected results and what to inspect.
- MCP is for manual and agent verification, not a test runner. Automated checks run through `mise run test` (Vitest) and `mise run test:e2e` (Playwright Test).

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
- [ ] `docs/SPEC.md` updated if user-facing behavior changed.
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

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
