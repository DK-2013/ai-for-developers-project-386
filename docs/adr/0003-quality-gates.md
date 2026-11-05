# Quality gates match the defects this codebase can produce

The repo adopts the checks from `mokevnin/dev-quality-gates` that can fail on something a change here can actually break: oxlint and oxfmt, rumdl for Markdown, knip for unused files and dependencies, dependency-cruiser for the `spec`/`server`/`web` boundaries, betterleaks for secrets, typecheck, and tests. Dependency advisories come from `osv-scanner` through `mise run check:osv`, which runs in the scheduled `security` workflow rather than in `mise run check`: it depends on an external database that can start failing without any change on our side, so it must not gate a pull request.

**Rejected:** oasdiff (the contract may break on purpose; there is one owner, one generated client, and no external consumer, and `AGENTS.md` forbids preserving backward compatibility); Conftest and ast-grep (dependency-cruiser already owns the package boundaries, a second mechanism would duplicate it); Renovate (Dependabot is already configured and covers the same updates).

**Deferred, each with the trigger that reopens it:** squawk — the first SQL migration in `packages/server/drizzle/`; check-jsonschema — a JSON or YAML file the repo does not generate itself; stylelint — CSS rules beyond the Tailwind entry file; axe — a requirement for accessibility in `docs/SPEC.md` or a recorded accessibility defect (Playwright Test now runs the browser, but axe stays deferred until that trigger); size-limit — an explicit bundle budget; diff-cover — a coverage threshold.

**Consequences:** a new gate is added only together with the defect it prevents, and an unlisted deferred gate stays out until its trigger appears, so the check list does not grow by imitation.
