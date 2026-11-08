# Browser checks

A repeatable UI verification scenario for the call-calendar app. Run it in a real browser before
merging a UI change, after changing the contract, or when an issue asks for a browser check. It
covers the public meeting-type list, the owner cabinet, meeting-type creation, the guest booking flow
(slots, time zones, conflict, success), the upcoming-bookings list, and navigation.

This is a manual check for a human or an agent, not a test suite. Automated browser checks live in
Playwright Test (`mise run test:e2e`); the MCP servers are developer tools, not a test runner.

## Prerequisites

| Need | Command | Ready when |
| --- | --- | --- |
| Toolchain | `mise install` | `mise --version` works |
| Dependencies, codegen, hooks | `mise run setup` | once per clone |
| Chromium for MCP | `mise run mcp:browsers` | Chromium is installed in the Playwright cache |
| MCP servers | `mise run mcp:check` | both servers report `connected` and launch a browser |
| App | `mise run dev` | Vite is ready on <http://localhost:5173> and `curl http://localhost:3000/healthz` returns `{"status":"ok"}` |

`mise run dev` starts the PostgreSQL container (`docker compose up -d --wait db`). The compose
project is pinned to `call-calendar`, so every checkout reuses the same container. If startup fails
with "port is already allocated", another compose project owns port 5432; stop that container.

Wait for the readiness condition, not for a fixed delay. `curl` with `--retry` or Playwright's
auto-waiting is enough.

The default owner configuration is `Europe/Moscow`, working hours `10:00`–`18:00`, Monday–Friday.
Override it in `.env` only when a step needs a different zone; a run against the defaults is the
normal case. The booking window is the current owner-local day plus the following 13 days.

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
- **Expectations come from `docs/SPEC.md`.** If the UI and the spec disagree, the spec wins and the
  step is a failure.
- **Booking steps write to the database.** Use unique names and pick a free slot so repeated runs stay
  distinguishable. Do not reuse a slot that an earlier step already booked.

## Playwright MCP recipes

Use Playwright MCP for navigation and snapshots. Use Chrome DevTools MCP when you need a stack trace,
request timing, or a performance trace.

| Goal | Playwright MCP call |
| --- | --- |
| Navigate | `browser_navigate({ url })` |
| Inspect the page | `browser_snapshot()`; the accessibility tree is better than a screenshot for assertions |
| Wait for text | `browser_wait_for({ text, time: 20 })` |
| Click | `browser_click({ element, target })` with a ref from the latest snapshot |
| Type | `browser_type({ element, target, text })` with a ref from the latest snapshot |
| Console | `browser_console_messages({ level: "warning" })` |
| Network | `browser_network_requests({ static: false })`; details with `browser_network_request({ index })` |
| Screenshot | `browser_take_screenshot({ filename: ".playwright-mcp/..." })` |

Refs change after every navigation and DOM update, so take a fresh snapshot before clicking or
typing. If MCP is unavailable, use Playwright directly with the same locators and waits; do not
replace waits with sleeps.

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
`Календарь звонков` pointing to `/` and the link `Личный кабинет` pointing to `/owner`.
`Календарь звонков` is marked as the current page (`aria-current="page"`) and `Личный кабинет` is
not. The main area shows the meeting-type list from step 3.

**Console:** no uncaught errors. A `favicon.ico` `404` may appear on a cold load because the app
ships no favicon; record it, do not fail the run on it.

**Network:** the document and the Vite module requests return `200`.

**SPEC:** [guest sees meeting types without registration](../SPEC.md#checkpoints).

### 3. Public page: meeting-type list loads

**Action:** from `/`, wait for the final list state. Do not stop at `Загрузка...`.

**Expected:** the heading `Выберите тип встречи`. On a clean install the seeded type `Звонок`
(`Стандартный звонок`, `15 мин`) is present as a card and links to `/book/{id}`. If the database has
no meeting types, the paragraph `Пока нет доступных типов встреч` appears and no cards are rendered;
that is a failure on a clean install, where the seeded type must exist. The error state
`Не удалось загрузить типы встреч.` is always a failure.

**Console:** no uncaught errors, except the optional favicon `404` from step 2.

**Network:** `GET /api/meeting-types` returns `200`. The response body has a `meetingTypes` array
that includes every saved type, including the seeded one.

**SPEC:** checkpoints `Гость видит список типов встреч без регистрации` and `На чистой установке
гость видит доступный тип встречи по умолчанию` in [Checkpoints](../SPEC.md#checkpoints).

### 4. Owner cabinet: tabs, upcoming bookings, and meeting-type list

**Action:** from `/`, click `Личный кабинет`, then switch to the `Типы встреч` tab.

**Expected:** the URL becomes `/owner`. The header link `Личный кабинет` is marked as the current
page (`aria-current="page"`); `Календарь звонков` is not. Below the header are two tabs, `Встречи`
and `Типы встреч`; `Встречи` is active and `Типы встреч` is not. The page has exactly one `h1`,
`Предстоящие встречи`; the old `Личный кабинет` heading and the intro paragraph are absent, and the
creation form is not inline on this tab. If no booking is upcoming, the list shows
`Пока нет предстоящих встреч.`; otherwise each item shows the meeting type name, the day and
start–end time, and the attendee name and e-mail, ordered by start.

Switching to `Типы встреч` changes the URL to `/owner/meeting-types`. The `Типы встреч` tab becomes
active and `Встречи` does not; the header link `Личный кабинет` stays active. The page has exactly
one `h1`, `Типы встреч`, and the button `Добавить тип встречи`. The list shows every meeting type
with its name, optional description, and duration (`30 мин`), in creation order, oldest first. The
items are read-only: they contain no link to a booking page. With no meeting types the paragraph
`Пока нет типов встреч.` appears; on a clean install the seeded `Звонок` must be present, so the
empty state is a failure there. The error state `Не удалось загрузить типы встреч.` is always a
failure. Direct navigation to `/owner/meeting-types` renders the same section, and browser Back and
Forward switch between the two sections.

**Console:** no errors.

**Network:** the `Встречи` tab requests `GET /api/bookings` and returns `200` with a `bookings`
array; the `Типы встреч` tab requests `GET /api/meeting-types` and returns `200` with a
`meetingTypes` array. A failure renders `Не удалось загрузить предстоящие встречи.` or
`Не удалось загрузить типы встреч.` and fails the step.

**SPEC:** checkpoint `Владелец видит список предстоящих встреч всех типов` in
[Checkpoints](../SPEC.md#checkpoints).

### 5. Owner creates a meeting type in a modal

**Action:** on `/owner/meeting-types`, click `Добавить тип встречи`. Confirm focus moves to
`Название`, then close and reopen the dialog once with each close path: the `Закрыть` button (`×`),
`Esc`, a backdrop click, and `Отмена`. Finally fill the form with a unique name (for example
`Проверка UI <date>`), an optional description, and a duration of `30` minutes, then submit
`Создать тип встречи`.

**Expected:** the dialog `Новый тип встречи` opens over the list and the URL stays
`/owner/meeting-types`. The form fields are `Название`, `Описание (необязательно)`,
`Длительность, минут`; the buttons are `Создать тип встречи` and `Отмена`. Every close path hides
the dialog, leaves the URL unchanged, and sends no request. While submitting, the submit button
reads `Создание...`, the close, cancel, `Esc`, and backdrop paths do not dismiss the dialog, and the
form is not cleared. On success the dialog closes, the form resets, the list refreshes with the new
type, and `Тип встречи создан.` appears next to `Добавить тип встречи`; opening the dialog again
clears that message. The duration input rejects values outside 15–1440 and values that are not
multiples of 15 before any request. A failed creation keeps the dialog open with the error inside:
a `400` shows the server message, any other failure shows
`Не удалось создать тип встречи. Попробуйте ещё раз.`. Trigger the failure by blocking
`POST /api/meeting-types` in DevTools (Network request blocking) or stopping the API.

**Console:** no errors. For the failure path, the browser logs the rejected request as a resource
error; that is expected.

**Network:** opening, closing, and validating the dialog send no request. On success
`POST /api/meeting-types` returns `201` with the created object, including a non-empty `id`, the
submitted `name`, and `durationMinutes: 30`, followed by `GET /api/meeting-types` returning `200`
with the new type. The request body omits an empty description. A failed submit returns a `400` or
a network error and no success message.

**SPEC:** checkpoint `Владелец может создать тип встречи (название, описание, длительность)` in
[Checkpoints](../SPEC.md#checkpoints).

**Note:** this writes to the database. Use a unique name so repeated runs stay distinguishable.

### 6. Public page shows the created type

**Action:** click `Календарь звонков` in the header to return to `/`.

**Expected:** the new type appears as a card with its name, description, `30 мин`, and a link to
`/book/{id}`. The seeded type is still present.

**Console:** no errors.

**Network:** `GET /api/meeting-types` returns `200` and the response includes the new type.

**SPEC:** checkpoint `Гость видит список типов встреч без регистрации` in
[Checkpoints](../SPEC.md#checkpoints).

### 7. Guest booking page: slots, window, and time zones

**Action:** click the created type card and wait for the slot grid.

**Expected:** the URL becomes `/book/{id}`. The heading is `Выбор времени`, followed by
`<name> · 30 мин`. The line `Время в вашем часовом поясе. Часовой пояс владельца: Europe/Moscow.`
is shown (the zone reflects the owner config). Slots are grouped under day headings in the guest's
browser zone, and the link `Назад к списку типов встреч` points to `/`. With the default
configuration every start is on the 15-minute grid and fits inside `10:00`–`18:00` owner time on a
weekday, and no start is at or before the current moment. When no slot fits the remaining window,
the page shows `Нет свободных слотов в ближайшие 14 дней.`.

The owner's zone fixes the grid; only the display follows the browser zone. To check the display
zone, compare a slot's rendered time with the same instant in the browser's zone: changing the
browser zone shifts the rendered times, not the set of bookable instants. To check the window, read
the slots response: `windowStart` is midnight of the current owner-local day, `windowEnd` is midnight
14 days later, and `timezone` is the owner zone. The window is anchored to the current clock; a later
run on another owner-local day must show a window shifted forward by a day.

**Console:** no errors.

**Network:** `GET /api/meeting-types` and `GET /api/meeting-types/{id}/slots` both return `200`. The
slots body contains `timezone`, `windowStart`, `windowEnd`, and a `slots` array of `startAt`/`endAt`
instants.

**SPEC:** checkpoints `Гость видит свободные слоты на 14 дней вперёд`, `Слоты генерируются только в
рабочие часы и с заданным шагом`, `Слоты в прошлом недоступны для бронирования`, `Гость видит
календарь в часовом поясе своего браузера`, and `Окно бронирования сдвигается с течением времени` in
[Checkpoints](../SPEC.md#checkpoints).

### 8. Guest books a free slot

**Action:** click a free slot, fill `Имя` with a unique name and `E-mail` with a valid address,
then submit `Забронировать`.

**Expected:** the form is replaced by the section `Вы записаны` with the meeting type name, the day
and start time in the guest zone, and the attendee name and e-mail. Returning to the same booking
page (or refreshing it) no longer offers that start.

**Console:** no errors.

**Network:** `POST /api/bookings` returns `201` with the booking `id`, `meetingTypeId`,
`meetingTypeName`, `startAt`, `endAt`, `attendeeName`, and `attendeeEmail`. The slot list is
refetched afterwards.

**SPEC:** checkpoint `Гость может забронировать свободный слот` in
[Checkpoints](../SPEC.md#checkpoints).

### 9. Booking conflict shows a clear message

**Action:** in the booking page, select a free slot but do not submit yet. In a second tab (or with
`curl`), book the same `startAt` through `POST /api/bookings`. Return to the first tab and submit the
name and e-mail form.

**Expected:** the message `Это время уже занято. Пожалуйста, выберите другой слот.` appears, the
selection is cleared, and the slot grid refreshes without the taken start. The page does not show a
success state.

**Console:** no uncaught page errors. The browser logs the rejected request as
`Failed to load resource ... 409`; that is the expected conflict response.

**Network:** the first `POST /api/bookings` returns `201`; the second returns
`409 {"code":"slot_not_available","message":"Slot is not available"}` followed by a fresh
`GET /api/meeting-types/{id}/slots`.

**SPEC:** checkpoint `Повторное бронирование того же времени возвращает 409` in
[Checkpoints](../SPEC.md#checkpoints).

### 10. Overlap rules: partial overlap and back-to-back starts

**Action:** through the API, book a slot with one meeting type, then try to start another type
inside the first booking's interval, then try a start exactly at the first booking's `endAt`.

**Expected:** the partial overlap returns `409` with `slot_not_available`; the back-to-back start
returns `201` and its `startAt` equals the previous `endAt`.

**Console:** not applicable; this step is API-level.

**Network:** record the three `POST /api/bookings` responses.

**SPEC:** checkpoints `Частичное наложение интервалов разных типов запрещено` and `Встреча может
начинаться ровно в момент окончания предыдущей` in [Checkpoints](../SPEC.md#checkpoints).

### 11. Concurrent requests for one slot

**Action:** pick a free start and send two `POST /api/bookings` requests for it at the same time
(for example two tabs submitting the same stale selection, or two parallel `curl` processes).

**Expected:** exactly one response is `201`; the other is `409 slot_not_available`. Refreshing the
slot grid shows the start once as taken.

**Console:** no uncaught page errors. A browser-level `409` resource error for the losing request is
expected.

**Network:** record both responses and their timings.

**SPEC:** checkpoint `Два одновременных запроса на один слот: один успешен, второй — 409` in
[Checkpoints](../SPEC.md#checkpoints).

### 12. Owner sees the new booking, ordered and without finished ones

**Action:** open `/owner` (or select the `Встречи` tab).

**Expected:** the `Встречи` tab is active, and `Предстоящие встречи` lists the bookings from
steps 8–11 across all meeting types, ordered by start. Each item shows the type name, day,
start–end time, and attendee name and e-mail.
Finished bookings are absent: a booking whose `endAt` is in the past never appears. On a database
with no upcoming bookings, `Пока нет предстоящих встреч.` is shown instead.

**Console:** no errors.

**Network:** `GET /api/bookings` returns `200` with upcoming bookings only, sorted by `startAt`.

**SPEC:** checkpoint `Владелец видит список предстоящих встреч всех типов` in
[Checkpoints](../SPEC.md#checkpoints).

### 13. In-app navigation and history

**Action:** start at `/book/{id}`, then:

1. click `Назад к списку типов встреч` and wait for `/`;
2. click `Личный кабинет` and wait for `/owner`;
3. click `Типы встреч` and wait for `/owner/meeting-types`;
4. use browser Back twice and Forward twice.

**Expected:** every in-app link updates the URL and the main content without a full page reload. The
header stays in place. Back and Forward restore the previous URL and page, including the active tab
and the single `h1` of each section. After the final Forward the URL is `/owner/meeting-types` and
the `Типы встреч` tab is active. On `/` the public list from step 6 appears.

**Console:** no errors. Only the unknown-route warning from step 14 is allowed, and only on that
route.

**Network:** in-app navigations add no document request. If the destination queries data, its API
request appears in the network panel.

**SPEC:** navigation only; no checkpoint.

### 14. Unknown route

**Action:** navigate to <http://localhost:5173/does-not-exist>.

**Expected:** the header still renders, the main area is empty, and the URL stays
`/does-not-exist`. There is no 404 page in the app.

**Console:** React Router logs `No routes matched location "/does-not-exist"` twice under
`StrictMode`. That is a warning, not an error.

**Network:** the document returns `200`.

**SPEC:** no checkpoint; a not-found page is not in the contract. Record it and do not fail the run
on it unless the task adds one.

### 15. API surface behind the UI (optional)

This is not a UI step. It separates an API failure from a UI failure when a checklist step fails.
Vite proxies `/api` to the API and strips the prefix, so `/api/meeting-types` reaches
`GET /meeting-types` on port 3000. Open the requests in the browser or use `curl` through the proxy:

| Request | Expected response |
| --- | --- |
| `GET /api/healthz` | `200 {"status":"ok"}` |
| `GET /api/meeting-types` | `200` with all saved meeting types, including the seeded default |
| `POST /api/meeting-types` with a valid body | `201` and the saved type |
| `GET /api/meeting-types/{id}/slots` | `200` with `timezone`, a 14-day `windowStart`/`windowEnd`, and free `slots` on the owner-local grid |
| `POST /api/bookings` with a valid free slot | `201` and the booking |
| `POST /api/bookings` for a taken or non-bookable start | `409 {"code":"slot_not_available","message":"Slot is not available"}` |
| `GET /api/bookings` | `200` with upcoming bookings across all types, sorted by start |

Use these to confirm that the contract and the server agree; do not treat a stale or unexpected
response as a pass.

## Recording a run

Copy this template into the issue or pull request:

```text
Date:
Commit:
Browser:
Environment: mise run dev | mise run --skip-deps dev
Step 1: PASS — 200 {"status":"ok"}
Step 2: PASS — title, header links
Step 3: PASS — seeded type and GET /api/meeting-types 200
Step 4: PASS — owner cabinet tabs, upcoming list, meeting-type list
Step 5: PASS — modal open/close, POST /api/meeting-types 201, confirmation
Step 6: PASS — created type card
Step 7: PASS — slot grid, owner zone reference, 14-day window
Step 8: PASS — POST /api/bookings 201, success state
Step 9: PASS — conflict message on 409
Step 10: PASS — partial overlap 409, back-to-back 201
Step 11: PASS — concurrent requests: one 201, one 409
Step 12: PASS — owner list ordered, no finished bookings
Step 13: PASS — history and tabs
Step 14: PASS — unknown route warning only
Step 15: PASS — API surface
...
Console: <path or summary>
Network: <path or summary>
Artifacts: .playwright-mcp/browser-checks/<date>/
Notes:
```

A run is complete when every step is marked PASS or FAIL with evidence. A failing step is a finding,
not a reason to rewrite the expected result.

## Cleanup

Stop the dev server with `Ctrl+C`. Leave the shared `call-calendar-db-1` container running if
another checkout may be using it; otherwise stop it with `mise run db:down`. `.playwright-mcp` is
gitignored, so the artifacts can stay on disk; do not commit them.
