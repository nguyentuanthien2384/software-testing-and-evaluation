#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$PROJECT_ROOT/source/teacher-payroll-app"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
APP_PORT="${APP_PORT:-3000}"
APP_LOG="$PROJECT_ROOT/evidence/dev-smoke-summary.txt"
APP_PID=""
QA_DATABASE_DIR=""

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" || true
  fi
  if [[ -n "$QA_DATABASE_DIR" && -d "$QA_DATABASE_DIR" ]]; then
    case "$(basename "$QA_DATABASE_DIR")" in
      teacher-payroll-qa.*) rm -rf -- "$QA_DATABASE_DIR" ;;
      *) echo "Refusing to remove unexpected QA database directory: $QA_DATABASE_DIR" >&2 ;;
    esac
  fi
}
trap cleanup EXIT

cd "$APP_DIR"
npm install

# The combined local QA command must never mutate prisma/dev.db. Build a fresh,
# disposable database unless the caller deliberately supplies QA_DATABASE_URL.
if [[ -n "${QA_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="$QA_DATABASE_URL"
else
  QA_DATABASE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/teacher-payroll-qa.XXXXXX")"
  QA_DATABASE_FILE="$QA_DATABASE_DIR/qa.db"
  if command -v cygpath >/dev/null 2>&1; then
    QA_DATABASE_FILE="$(cygpath -m "$QA_DATABASE_FILE")"
  fi
  # Prisma on some Windows installations cannot create the SQLite file itself
  # during `migrate deploy`, even when its parent directory exists.
  : > "$QA_DATABASE_DIR/qa.db"
  export DATABASE_URL="file:$QA_DATABASE_FILE"
fi

npm run db:deploy
npm run db:seed
npm run build
PORT="$APP_PORT" npm run start > "$APP_LOG" 2>&1 &
APP_PID=$!

for _ in $(seq 1 45); do
  if curl -fsS "$BASE_URL/api/health" >/dev/null; then
    break
  fi
  sleep 2
done

curl -fsS "$BASE_URL/api/health" >/dev/null

cd "$PROJECT_ROOT/tests/selenium-js"
npm install
BASE_URL="$BASE_URL" BROWSER="${BROWSER:-chrome}" npm run test:junit

cd "$PROJECT_ROOT"
JMETER_PROTOCOL="${JMETER_PROTOCOL:-http}" \
JMETER_HOST="${JMETER_HOST:-127.0.0.1}" \
JMETER_PORT="${JMETER_PORT:-$APP_PORT}" \
bash tests/jmeter/run-yc8.sh
