# CODING_STANDARDS.md

Implementation rules for this repository. `AGENTS.md` defines precedence, workflow, and Definition of Done. This file details code-level rules; when a rule has an exception, the exception is written here. The rules describe the target implementation; see `AGENTS.md` (`Current scaffold`) for what is not wired yet.

## Code shape

- **Fetching data is separate from using it.** Read a value into a named variable first, then use it:
  ```ts
  const slots = await repo.listSlots(range);
  expect(slots).toHaveLength(3);
  ```
  Never put a DB call, a promise chain, or a computation inside an `assert`, a function argument, or an `if` condition. Same in production code: `const row = await ...` first, then the `if`/`return` that uses it. A failing test should show which step produced the wrong value.

- **No error is swallowed.** `catch {}`, `catch (e) { return null }`, and `.catch(() => {})` without justification are forbidden. For work-after-the-fact steps (closing a connection, rolling back a transaction), use a wrapper that logs the error. If an error truly cannot be acted on, add it to [Known ignored errors](#known-ignored-errors) with a reason; do not leave an inline empty catch.

- **Errors are the standard library's.** Use `Error` with `cause`, `AggregateError`; do not pull in a third-party error library. Wrap with `<operation>: <detail>`, passing the original through `{ cause: err }`. A caller that needs to branch catches a typed error class (e.g. `ValidationError`), not by comparing `message` strings. Domain codes (`409`, `404`) are mapped in one place — at the HTTP boundary.

- **Boundaries validate contract types.** Wire types come from `main.tsp` through generated code. Handwritten wire DTOs are forbidden. DB rows, domain objects, and view models are allowed as separate types; map them explicitly at the boundary instead of casting.

- **Owner-local date/time logic goes through one module.** `packages/server/src/domain/time` is the only place allowed to compute the owner's "today", working window, slot step, DST transitions, or local wall-clock values. Do not scatter `new Date()`, `getHours()`, or ad-hoc timezone math. Use `Temporal` (`temporal-polyfill` is installed). Store instants as `timestamptz` in UTC; use the owner timezone only for local calculation and display. Test the module in isolation from HTTP and the DB.

## Contract and generated code

- **The contract is the source of truth.** `packages/spec/main.tsp` is the only source. Emitters run in parallel and produce `packages/spec/openapi.json`, `packages/server/src/generated/`, and `packages/web/src/sdk/`. `openapi.json` is an artifact, not an input to the JS emitters.
- **Generated output is never edited.** Those three paths are gitignored. Change `main.tsp`, run `mise run codegen`, and commit only the source change. A commit that edits generated output is invalid; a commit that changes `main.tsp` without running codegen is incomplete.
- **Server routing uses the generated router.** Do not hand-write routes that duplicate the contract. If generated code does not enforce a constraint, validate it once at the HTTP boundary.
- **Imports between `server` and `web` are forbidden.** Neither `web → server` nor `server → web`. Circular imports are forbidden. `dependency-cruiser.cjs` enforces both rules. The generated SDK (`@calendar/client`) lives inside `web` and is used by `web`; `server` uses its own generated types. Shared code is generated independently into each package, not imported across the boundary.
- **The SDK import must be wired, not guessed.** `@calendar/client` is generated into `packages/web/src/sdk`. Use the workspace dependency or path alias configured for `web`; if it is missing, fix the wiring. Never create a second client or copy generated files out of `sdk/`.

## Migrations and database

- **Schema lives in Drizzle.** `pnpm db:generate` writes SQL into `packages/server/drizzle/`. `MIGRATE_ON_START` is a runtime flag for dev/CI, not a codegen switch.
- **Custom migrations are allowed only for what Drizzle cannot express as a schema change:**
  - extensions, e.g. `CREATE EXTENSION IF NOT EXISTS btree_gist`;
  - exclusion constraints, e.g. `EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)`;
  - data backfills that cannot be expressed as a schema change.

  Generate these with `drizzle-kit generate --custom`, keep the SQL minimal, and state the reason in the migration. Everything else goes through the generator; do not hand-write ordinary tables, columns, indexes, or constraints.

- **Tables, columns, constraints, indexes, and extensions only.** No triggers, stored procedures, or views. Logic that must run on every write lives in server code inside the same transaction.
- **Overlap protection is the database's job.** The `EXCLUDE` constraint is the source of truth. Map PostgreSQL error `23P01` to `409 Conflict` at the HTTP boundary. A pre-check before `INSERT` is not a substitute: another request can win the race.
- **Time is stored as `timestamptz` in UTC.** Owner-local calculations go through `domain/time`; do not store local wall-clock strings as the source of truth.

## Checks

- **`mise run check` is the full gate.** It runs `mise run codegen` first, then `hk check --all`: oxlint, oxfmt, syncpack, hadolint, typos, agnix, vacuum, typecheck, depcruise, tests, betterleaks, suppression-date check, and jactionlint.
- **`mise run check:fast` is not the full gate.** It runs `hk run pre-commit --staged --check` and skips `codegen`, `typecheck`, `depcruise`, and tests. Use it while iterating; use `mise run check` before pushing.
- **Formatter is `oxfmt`, linter is `oxlint --deny-warnings`.** ESLint is not configured alongside it.
- **Disabling a rule is an exception, not a default.** A config-level override needs `review YYYY-MM-DD: <reason>`; an inline `// oxlint-disable` needs the same review-dated reason. `scripts/check-suppression-dates.mjs` enforces the date format and expiry for tracked suppression files. The `no-unused-vars` override in `.oxlintrc.json` is the model, not a precedent for silent disables.
- **`agnix --strict .` passes.** No agent/generator commits without running `mise run check`.
- **New dependencies need a reason.** Prefer the standard library and existing packages; do not add a second library for the same job.

## Tests (Vitest)

- **Real PostgreSQL in integration tests.** `mise run test` starts it automatically. SQLite substitutes and mocked Drizzle for booking/overlap checks are forbidden: the `EXCLUDE` constraint and `timestamptz` behavior are part of what is being tested.
- **Test database strategy.** `TEST_DATABASE_URL` overrides the default `call_calendar_test`. Each worker gets an isolated database or schema created from a template. Tests that do not need concurrency use a transaction that is rolled back. Concurrency tests use separate connections and committed rows; they may use a dedicated database and must clean up in `afterAll`. Do not use ad-hoc `TRUNCATE`/reset in individual tests; use the shared helpers.
- **No `sleep`.** Wait on a condition (a returned handle, polling with a deadline, `vi.waitFor`). Move logic that needs "time" into a pure function that takes a clock. A test that needs to advance time uses `vi.useFakeTimers()` and `vi.setSystemTime()`, not real delays.
- **Property tests for the risky pure logic.** The slot generator, time normalization, and overlap checking get properties that must hold for every input (bounds, idempotence, monotonicity, agreement with a simple model). Use `fast-check` when the first property test lands; add the dependency in the same change. Examples next to them stay for the business rules from the README.
- **Fuzz only where there is a parser.** A request-body validator or date/duration parser gets a fuzz target when it is added: "for any input: a result or an error, never both, and no crash". Do not add fuzz infrastructure before the parser exists.
- **One behavior per test, not one behavior per file.** `*.test.ts` holds pure logic (slot generator, error mapping, DTOs). `packages/server/test/app.test.ts` and similar hold integration tests (meeting type creation, booking, `409`, concurrent requests). Do not mix unit and integration in the same file.
- **A race gets its own test.** "Two concurrent requests for one slot: one `2xx`, the second `409`" via `Promise.allSettled` against a real DB, not a simulation.
- **Tests do not bypass production code paths.** Do not replace the router, repository, or DB with mocks in integration tests. Invalid-input tests may bypass static types only at the call boundary (`as unknown as` or `@ts-expect-error` with a reason); `as any` is forbidden.
- **Web tests exist only when the web app exists.** Add a test script to `packages/web` before claiming web coverage. Logic tests run on every PR; page-rendering tests run only when a browser runner is configured.

## Frontend

- **Styling is Tailwind + shadcn/ui.** One theme file (`src/index.css` or `tailwind.css`) contains the Tailwind import and shadcn CSS variables. Other `.css`/CSS modules, hardcoded colors in feature code, and CSS-in-JS are forbidden.
- **`style={{...}}` is an exception.** Use it only for a dynamic value that cannot be expressed with a Tailwind utility or a CSS variable, and leave a short comment explaining why.
- **Use semantic tokens in feature code.** Prefer `bg-background`, `text-foreground`, `border-border` and similar theme tokens. Raw palette classes (`bg-blue-500`) belong in the theme definition, not in page components.
- **shadcn components are vendored.** Customize them through variants and props; do not duplicate a component or fork it without a reason.
- **Theme and responsiveness use Tailwind primitives.** Breakpoints, `hidden`/`md:block`, and CSS variables; no custom media queries in separate files.
- **`server` and `web` do not import each other.** Shared code is the generated SDK and independently generated types; there is no runtime sharing across the boundary.

## Git and process

- **Conventional Commits are mandatory** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`). The header, body, and footer lines are ≤ 100 characters; this matches `@commitlint/config-conventional`. If the limits change, change `commitlint.config.mjs` and this rule together.
- **History stays linear.** `git fetch origin && git rebase origin/main`, never `git merge`. Merge commits (`chore: merge origin/main`) are forbidden. Rebase only your own branch; never force-push `main` or a shared branch.
- **`.github/workflows/hexlet-check.yml` is not deleted or renamed**, nor is the repository.
- **Before pushing,** `mise run check` must pass fully. The pre-push hook runs `hk pre-push` (typecheck, depcruise, tests, security checks) but not `codegen`; it is not a replacement for the full gate. Pre-commit runs hk in fix mode and re-stages files — inspect the resulting diff.
- **Commit and push only when asked.** Do not commit generated files or unrelated formatting.

## Known ignored errors

None. Add an entry here with the function, the reason no caller can act on the error, and why it cannot be handled or logged. This list is not a substitute for handling errors.

## Language

README and user-facing docs are Russian. Code, code comments, agent docs, and commit messages are English.
