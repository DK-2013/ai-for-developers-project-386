# AGENTS.md

## Rules

- Fix the cause, not the symptom.
- Simplest implementation that meets requirements.
- No backward-compatibility preservation.

## Precedence

1. `packages/spec/main.tsp` — API shape.
2. `docs/SPEC.md` — product behavior.
3. `CODING_STANDARDS.md` — implementation rules.

Conflicting sources: stop and report, never choose silently.

## Structure

pnpm monorepo: `packages/spec` (TypeSpec contract), `packages/server` (node:http, Drizzle, PostgreSQL), `packages/web` (React, Vite). No imports between server and web; no circular imports.

## Contract

`main.tsp` is the only API source of truth; `openapi.json`, `generated/`, `sdk/` are generated. Map wire → domain → DB/view at the boundaries; never hand-write wire DTOs.

## Commands

Discover via `mise tasks` / `mise.toml` / `hk.toml`. Key gates: `mise run check` while iterating, `mise run verify` before pushing. Implementation standards: `CODING_STANDARDS.md`.

## Hard rules

- Generated codegen output is read-only.
- Booking/overlap tests run against real PostgreSQL.
- Tests inject a clock or use fake timers.
- `.github/workflows/hexlet-check.yml` is read-only.
- Lint exceptions only via the documented review-dated mechanism.

## Stop and ask

- changing `main.tsp` / public API, schema or migrations;
- new dependency or package;
- changing rules in this file or `CODING_STANDARDS.md`;
- conflicting sources; working around an unrelated failing check.

## Conventions

Commits: Conventional Commits, lines ≤ 100 chars, ticketed commits end with `(#N)`; linear history. Docs for users in Russian; code and agent docs in English.

## Pointers

- Browser verification checklist: `docs/agents/browser-checks.md`.
- Issues (`gh` CLI): `docs/agents/issue-tracker.md`; triage labels: `docs/agents/triage-labels.md`.
- Domain model: `GLOSSARY.md` + `docs/adr/`, see `docs/agents/domain.md`.
