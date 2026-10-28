#!/usr/bin/env bash
# Applies backend/src/db/migrations/*.sql to Supabase in filename order.
# Idempotent via the ci_cd.migration_history tracking table.
#
# Env:
#   SUPABASE_DB_URL                  (required) Supabase session-pooler/db connection string
#   SUPABASE_MIGRATIONS_ADOPT_UNTIL  (optional) filename like 010_vital_readings.sql;
#                                    marks migrations up to and including it as applied
#                                    without executing (for DBs provisioned out-of-band)
#
# Usage: apply-migrations.sh [migration_dir]   (default: backend/src/db/migrations)

set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be set}"

MIG_DIR="${1:-backend/src/db/migrations}"
ADOPT_UNTIL="${SUPABASE_MIGRATIONS_ADOPT_UNTIL:-}"

if [ ! -d "$MIG_DIR" ]; then
  echo "::error::Migration dir not found: $MIG_DIR"
  exit 1
fi

psql_cmd() { psql "$SUPABASE_DB_URL" "$@"; }

# psql variable substitution (:'fname') only works in script/stdin mode, not -c,
# so every parameterized statement is piped in via stdin.
history_has() {
  echo "SELECT 1 FROM ci_cd.migration_history WHERE filename = :'fname';" \
    | psql_cmd -tA -v fname="$1"
}

mark_applied() {
  echo "INSERT INTO ci_cd.migration_history (filename) VALUES (:'fname');" \
    | psql_cmd -q -v fname="$1"
}

psql_cmd -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS ci_cd;
CREATE TABLE IF NOT EXISTS ci_cd.migration_history (
    filename   text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
files=("$MIG_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "::error::No .sql migration files in $MIG_DIR"
  exit 1
fi

count=$(psql_cmd -tA -c "SELECT count(*) FROM ci_cd.migration_history")
adopting=0
if [ "$count" -eq 0 ] && [ -n "$ADOPT_UNTIL" ]; then
  adopting=1
  echo "History table empty; adopting migrations up to $ADOPT_UNTIL without executing (out-of-band schema)."
fi

for f in "${files[@]}"; do
  name=$(basename "$f")

  if [ "$(history_has "$name")" = "1" ]; then
    echo "skip   $name (already applied)"
    continue
  fi

  if [ "$adopting" = "1" ]; then
    mark_applied "$name"
    echo "adopt  $name (marked applied, not executed)"
    if [ "$name" = "$ADOPT_UNTIL" ]; then
      adopting=0
    fi
    continue
  fi

  echo "::group::apply $name"
  psql_cmd -v ON_ERROR_STOP=1 -q -f "$f"
  mark_applied "$name"
  echo "::endgroup::"
  echo "apply  $name done"
done

echo "Migrations up to date."
