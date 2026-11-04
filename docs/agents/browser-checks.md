# Browser checks

A repeatable UI verification scenario for the call-calendar app. Run it in a real browser before
merging a UI change, after changing the contract, or when an issue asks for a browser check. It
covers the public page, the owner cabinet, and navigation. Booking scenarios are listed as pending
and are added when the booking engine lands.

This is a manual check for a human or an agent, not a test suite. Automated browser checks live in
Playwright Test (`mise run test:e2e`, ticket #18); the MCP servers are developer tools, not a test
runner.

## Prerequisites

| Need | Command | Ready when |
| --- | --- | --- |
| Toolchain | `mise install` | `mise --version` works |
| Dependencies, codegen, hooks | `mise run setup` | once per clone |
| Chromium for MCP | `mise run mcp:browsers` | Chromium is installed in the Playwright cache |
| MCP servers | `mise run mcp:check` | both servers report `connected` and Chromium is found |
| App | `mise run dev` | Vite is ready on <http://localhost:5173> and `curl http://localhost:3000/healthz` returns `{"status":"ok"}` |

`mise run dev` starts the PostgreSQL daemon. If another worktree already owns port 5432, the daemon
cannot bind it; in that case run `mise run --skip-deps dev` and use the database that is already
running. Do not stop another worktree's daemon.

Wait for the readiness condition, not for a fixed delay. `curl` with `--retry` or Playwright's
auto-waiting is enough.

## Rules

- **No `sleep`.** Wait on observable state: Playwright auto-waiting, `browser_wait_for({ text })`, a
  visible locator, or a request/response event.
- **A timeout is not a delay.** React Query retries a failed request for several seconds, so give the
  final state a timeout of up to 20 seconds. Do not insert a pause before looking.
- **Artifacts go to `.playwright-mcp/`.** It is gitignored at the repository root. Use a path such as
  `.playwright-mcp/browser-checks/<YYYY-MM-DD>/<step>-<artifact>.png` and never commit it.
- **Record evidence per step.** A step passes only when the visible result, the console, and the
  network all match. Save the accessibility snapshot, console dump, and network list for failures.
- **Continue after a failure** unless it blocks later steps. One run should report every regression,
  not only the first one.
- **Product expectations come from `docs/SPEC.md`.** The `Current scaffold` notes describe unfinished
  code; they are not the target behavior.

## Playwright MCP recipes

Use Playwright MCP for navigation and snapshots. Use Chrome DevTools MCP when you need a stack trace,
request timing, or a performance trace.

| Goal | Playwright MCP call |
| --- | --- |
| Navigate | `browser_navigate({ url })` |
| Inspect the page | `browser_snapshot()`; the accessibility tree is better than a screenshot for assertions |
| Wait for text | `browser_wait_for({ text, time: 20 })` |
| Click | `browser_click({ element, target })` with a ref from the latest snapshot |
| Console | `browser_console_messages({ level: "warning" })` |
| Network | `browser_network_requests({ static: false })`; details with `browser_network_request({ index })` |
| Screenshot | `browser_take_screenshot({ filename: ".playwright-mcp/..." })` |

Refs change after every navigation and DOM update, so take a fresh snapshot before clicking. If MCP
is unavailable, use Playwright directly with the same locators and waits; do not replace waits with
sleeps.

## Checklist

### 1. API is up

**Action:** open <http://localhost:3000/healthz> or run `curl http://localhost:3000/healthz`.

**Expected:** `200 OK` with `{"status":"ok"}`.

**Console:** not applicable.

**Network:** one request, `200`, `content-type: application/json`.

**SPEC:** prerequisite; no checkpoint.

### 2. Public page shell

**Action:** navigate to <http://localhost:5173/>.

**Expected:** the document title is `Календарь звонков`. The header contains the link
`Календарь звонков` pointing to `/` and the link `Личный кабинет` pointing to `/owner`. The main
area shows a loading state, the meeting-type list, or the error state; step 3 decides which one is
correct.

**Console:** no uncaught errors. A single `favicon.ico` `404` is expected on a cold load because the
scaffold ships no favicon.

**Network:** the document and the Vite module requests return `200`. The only failed request may be
the favicon.

**SPEC:** [guest sees meeting types without registration](../SPEC.md#checkpoints).

### 3. Public page: empty meeting-type list

**Action:** from `/`, wait for the final list state. Do not stop at `Загрузка...`.

**Expected:** the heading `Выберите тип встречи` and the paragraph
`Пока нет доступных типов встреч`. No meeting-type cards are rendered.

**Console:** no uncaught errors, except the favicon `404` from step 2. A failed query is not an
excuse for a red console error.

**Network:** `GET /api/meeting-types` returns `200` with `{"meetingTypes":[]}`. No `4xx` or `5xx`
response for that request.

**SPEC:** checkpoint `Гость видит список типов встреч без регистрации` in
[Checkpoints](../SPEC.md#checkpoints).

**Current scaffold: this step fails.** The page settles on
`Не удалось загрузить типы встреч.` and the network panel has no `/api/meeting-types` entry. The
client is created with a relative endpoint, `new CallCalendarClient({ endpoint: "/api" })`, and
`@typespec/ts-http-runtime` rejects it with
`TypeError: Failed to construct 'URL': Invalid URL` before the request is sent. React Query swallows
the error, so the console can stay clean; the visible error state and the missing request are the
evidence. The fix belongs to the web-wiring work in issue #4. The step passes only when the empty
state and the `200` request appear; do not mark the error state as expected.

### 4. Owner cabinet via the header

**Action:** from `/`, click `Личный кабинет`.

**Expected:** the URL becomes `/owner`. The page has the heading `Личный кабинет`, the paragraph
`Учебный каркас: личный кабинет владельца календаря.`, and the button `Загрузить встречи`.

**Console:** no errors.

**Network:** no `/api` request. The owner page is a placeholder and does not fetch data yet.

**SPEC:** the checkpoints `Владелец может создать тип встречи` and
`Владелец видит список предстоящих встреч всех типов` are not verifiable yet; this step covers the
route and the shell only. See [Checkpoints](../SPEC.md#checkpoints).

### 5. Owner button is a placeholder

**Action:** click `Загрузить встречи`.

**Expected:** nothing changes. The URL stays `/owner`, the page keeps the same text, and the button
stays visible.

**Console:** no new messages.

**Network:** no new request.

**SPEC:** `Владелец видит список предстоящих встреч всех типов` remains pending. Do not mark that
checkpoint as passed because the button exists.

### 6. Owner cabinet deep link

**Action:** navigate directly to <http://localhost:5173/owner>.

**Expected:** the same owner page as step 4, rendered from a direct document request rather than from
in-app navigation.

**Console:** no errors.

**Network:** the document returns `200`; the Vite modules load. No `/api` request.

**SPEC:** navigation only; the owner checkpoints stay pending.

### 7. Booking placeholder deep link

**Action:** navigate to <http://localhost:5173/book/placeholder>. Any id works while the list is
empty.

**Expected:** the heading `Выбор времени`, the paragraph
`Свободные слоты и форма записи появятся, когда будет подключён движок бронирования.`, and the link
`Назад к списку типов встреч` pointing to `/`. There is no meeting-type line and no slot grid.

**Console:** no uncaught errors. The page may repeat the meeting-types query failure from step 3,
but it must not crash.

**Network:** no `GET /api/meeting-types/{id}/slots` request yet. The slot endpoint exists in the
contract but the page does not call it.

**SPEC:** the checkpoints `Гость видит свободные слоты на 14 дней вперёд` and
`Гость может забронировать свободный слот` are pending; see
[Checkpoints](../SPEC.md#checkpoints).

### 8. In-app navigation and history

**Action:** start at `/book/placeholder`, then:

1. click `Назад к списку типов встреч` and wait for `/`;
2. click `Личный кабинет` and wait for `/owner`;
3. use browser Back twice and Forward once.

**Expected:** every in-app link updates the URL and the main content without a full page reload. The
header stays in place. Back and Forward restore the previous URL and page. On `/` the public list
state from step 3 appears.

**Console:** no errors. Only the unknown-route warning from step 9 is allowed, and only on that
route.

**Network:** in-app navigations add no document request. If the destination queries data, its API
request appears in the network panel.

**SPEC:** navigation only; no checkpoint.

### 9. Unknown route

**Action:** navigate to <http://localhost:5173/does-not-exist>.

**Expected:** the header still renders, the main area is empty, and the URL stays
`/does-not-exist`. There is no 404 page in the scaffold.

**Console:** React Router logs `No routes matched location "/does-not-exist"` twice under
`StrictMode`. That is a warning, not an error.

**Network:** the document returns `200`.

**SPEC:** no checkpoint. This is a known scaffold gap: a not-found page is not in the contract.
Record it; do not fail the run on it unless the task adds a not-found page.

### 10. API surface behind the UI (optional)

This is not a UI step. It separates an API failure from a UI failure when a checklist step fails.
Vite proxies `/api` to the API and strips the prefix, so `/api/meeting-types` reaches
`GET /meeting-types` on port 3000. Open the requests in the browser or use `curl` through the proxy:

| Request | Current placeholder response |
| --- | --- |
| `GET /api/healthz` | `200 {"status":"ok"}` |
| `GET /api/meeting-types` | `200 {"meetingTypes":[]}` |
| `GET /api/bookings` | `200 {"bookings":[]}` |
| `GET /api/meeting-types/placeholder/slots` | `200` with `timezone: "UTC"`, `windowStart` equal to `windowEnd`, `slots: []` |
| `POST /api/meeting-types` with a valid body | `201` and the request fields echoed with `id: "placeholder"` |
| `POST /api/bookings` | `409 {"code":"slot_not_available","message":"Slot is not available"}` |

These are placeholders, not `docs/SPEC.md` behavior. Do not use them to claim a booking checkpoint.

## Pending booking scenarios

These [checkpoints](../SPEC.md#checkpoints) need the booking engine and the UI. Add a step here when
the corresponding screen lands; do not invent selectors, copy, or responses before then. The
Playwright Test specs from ticket #18 should reuse the same scenarios.

| Checkpoint in `docs/SPEC.md` | What the future step will assert | Depends on |
| --- | --- | --- |
| Guest sees free slots for 14 days | a 14-day grid from today in the owner time zone, with the window bounds visible | #6 |
| Slots only in working hours and on the 15-minute grid | no starts outside 10:00–18:00 owner time; starts fall on `:00`, `:15`, `:30`, `:45` | #6 |
| Past slots are unavailable | no start at or before the current moment | #6 |
| Guest sees the calendar in the browser time zone | times follow the browser zone; the owner zone is shown as reference | #6, [ADR 0004](../adr/0004-guest-calendar-renders-in-guest-timezone.md) |
| Guest books a free slot | the form accepts name and email, succeeds, and the slot disappears | #7 |
| A second booking of the same time returns 409 | the second attempt shows the conflict message | #7 |
| Partial overlap of different types is rejected | a booking that overlaps another type is refused | #7 |
| A meeting may start exactly when the previous one ends | a booking at the previous `endAt` succeeds | #7 |
| Two concurrent requests for one slot: one succeeds, one gets 409 | two tabs submit the same slot; the browser check records the two responses, while the integration test proves the race | #7 |
| The booking window slides with time | the visible window starts today and ends 14 days later on a later run | #6 |

## Recording a run

Copy this template into the issue or pull request:

```text
Date:
Commit:
Browser:
Environment: mise run dev | mise run --skip-deps dev
Step 1: PASS — 200 {"status":"ok"}
Step 2: PASS — title, header links
Step 3: FAIL — error state, no /api/meeting-types request
...
Console: <path or summary>
Network: <path or summary>
Artifacts: .playwright-mcp/browser-checks/<date>/
Notes:
```

A run is complete when every step is marked PASS or FAIL with evidence. A failing step is a finding,
not a reason to rewrite the expected result.

## Cleanup

Stop the dev server with `Ctrl+C`. Do not stop the shared `db` daemon if another worktree may be
using it. `.playwright-mcp` is gitignored, so the artifacts can stay on disk; do not commit them.
