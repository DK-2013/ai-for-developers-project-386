#!/bin/sh
set -eu

# External databases (Compose, Render, CI) set DATABASE_URL. Only the
# standalone image, such as the Hexlet check, needs the embedded database.
if [ -n "${DATABASE_URL:-}" ]; then
  exec "$@"
fi

export PGDATA=/app/data/pg
socket_dir=/app/data/pg-socket
mkdir -p "$socket_dir"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  initdb -D "$PGDATA" -U postgres --auth=trust --no-locale -E UTF8
fi

pg_ctl -D "$PGDATA" -o "-k $socket_dir -h 127.0.0.1 -p 5432" -w start

if ! psql -h 127.0.0.1 -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'call_calendar'" | grep -q 1; then
  createdb -h 127.0.0.1 -U postgres call_calendar
fi

export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/call_calendar
exec "$@"
