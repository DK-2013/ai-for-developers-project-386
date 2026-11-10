#!/bin/sh
set -eu

# External databases (Compose, Render, CI) set DATABASE_URL. Only the
# standalone image, such as the Hexlet check, needs the embedded database.
if [ -n "${DATABASE_URL:-}" ]; then
  exec "$@"
fi

export PGDATA=/app/data/pg

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  initdb -D "$PGDATA" -U postgres --auth=trust --no-locale -E UTF8
fi

pg_ctl -D "$PGDATA" -o "-h 127.0.0.1 -k /app/data -p 5432" -w start

if ! psql -h 127.0.0.1 -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'call_calendar'" | grep -q 1; then
  createdb -h 127.0.0.1 -U postgres call_calendar
fi

stop_postgres() {
  pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true
}

app_pid=
trap stop_postgres EXIT
trap 'if [ -n "$app_pid" ]; then kill -TERM "$app_pid"; fi' INT TERM

export DATABASE_URL=postgres://postgres@127.0.0.1:5432/call_calendar
"$@" &
app_pid=$!

# Save the app exit status before the EXIT trap stops PostgreSQL.
set +e
wait "$app_pid"
status=$?
set -e
exit "$status"
