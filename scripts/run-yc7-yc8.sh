#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$PROJECT_ROOT/source/teacher-payroll-app"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
APP_PORT="${APP_PORT:-3000}"
APP_LOG="$PROJECT_ROOT/evidence/dev-smoke-summary.txt"
APP_PID=""

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" || true
  fi
}
trap cleanup EXIT

cd "$APP_DIR"
npm install
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
