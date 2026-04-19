#!/bin/sh

set -eu

DB_NAME="${1:-astro_publisher_db}"
MODE="${2:---local}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler wurde nicht gefunden."
  exit 1
fi

cd "$PROJECT_DIR"

echo "Applying D1 migrations to '$DB_NAME' with mode '$MODE'..."
wrangler d1 migrations apply "$DB_NAME" "$MODE"
