#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
JMETER_BIN="${JMETER_BIN:-jmeter}"
RESULT_DIR="${RESULT_DIR:-$PROJECT_ROOT/evidence/jmeter-results}"
RESULT_FILE="${RESULT_FILE:-$RESULT_DIR/yc8-payroll-results.jtl}"
HTML_DIR="${HTML_DIR:-$RESULT_DIR/html-report}"

mkdir -p "$RESULT_DIR"
rm -rf "$HTML_DIR"
rm -f "$RESULT_FILE"

"$JMETER_BIN" \
  -q "$PROJECT_ROOT/tests/jmeter/user.properties" \
  -n \
  -t "$PROJECT_ROOT/tests/jmeter/teacher_payroll_baseline.jmx" \
  -Jprotocol="${JMETER_PROTOCOL:-http}" \
  -Jhost="${JMETER_HOST:-127.0.0.1}" \
  -Jport="${JMETER_PORT:-3000}" \
  -Jusers="${JMETER_USERS:-50}" \
  -Jramp="${JMETER_RAMP:-20}" \
  -Jloops="${JMETER_LOOPS:-10}" \
  -JmaxResponseMs="${JMETER_MAX_RESPONSE_MS:-2000}" \
  -JdataFile="$PROJECT_ROOT/tests/jmeter/data/payroll.csv" \
  -l "$RESULT_FILE" \
  -e -o "$HTML_DIR"

node "$PROJECT_ROOT/tests/jmeter/check-thresholds.mjs" \
  --file "$RESULT_FILE" \
  --max-average "${MAX_AVERAGE_MS:-1000}" \
  --max-p95 "${MAX_P95_MS:-2000}" \
  --max-error-rate "${MAX_ERROR_RATE:-1}" \
  --min-throughput "${MIN_THROUGHPUT:-0}"
