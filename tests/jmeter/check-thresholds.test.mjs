import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const checker = path.join(testDirectory, 'check-thresholds.mjs');
const endpointLabels = ['GET /api/health', 'POST /api/payroll', 'GET /api/reports'];

function completeSamples({ users = 1, loops = 1, base = Date.now() - 5_000, elapsed = 10 } = {}) {
  const samples = [];
  let offset = 0;
  for (let user = 0; user < users; user += 1) {
    samples.push({ timeStamp: base + offset, elapsed, label: 'POST /api/auth/login', success: true });
    offset += 10;
  }
  for (let loop = 0; loop < loops; loop += 1) {
    for (let user = 0; user < users; user += 1) {
      for (const label of endpointLabels) {
        samples.push({ timeStamp: base + offset, elapsed, label, success: true });
        offset += 10;
      }
    }
  }
  return samples;
}

function runChecker(samples, args = [], extraRows = [], header = 'timeStamp,elapsed,label,success') {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jmeter-checker-'));
  const resultFile = path.join(temporaryDirectory, 'result.jtl');
  const rows = [
    header,
    ...samples.map((sample) => [sample.timeStamp, sample.elapsed, sample.label, sample.success].join(',')),
    ...extraRows
  ];
  fs.writeFileSync(resultFile, `${rows.join('\n')}\n`, 'utf8');
  try {
    const gateEnvironment = { ...process.env };
    for (const key of [
      'MAX_AVERAGE_MS', 'MAX_P95_MS', 'MAX_ERROR_RATE', 'MIN_THROUGHPUT',
      'JMETER_USERS', 'JMETER_LOOPS', 'MAX_ARTIFACT_AGE_MINUTES', 'REQUIRED_JMETER_LABELS'
    ]) delete gateEnvironment[key];
    return spawnSync(process.execPath, [checker, '--file', resultFile, ...args], {
      encoding: 'utf8',
      env: gateEnvironment
    });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

const oneUserOneLoop = [
  '--expected-users', '1',
  '--expected-loops', '1',
  '--max-artifact-age-minutes', '5',
  '--min-throughput', '0'
];

test('passes a complete, fresh artifact and includes the final sample elapsed time', () => {
  const base = Date.now() - 3_000;
  const samples = completeSamples({ base });
  samples[1].timeStamp = base + 100;
  samples[2].timeStamp = base + 200;
  samples[3].timeStamp = base + 1_000;
  samples[3].elapsed = 1_000;

  const result = runChecker(samples, oneUserOneLoop);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"durationSeconds": 2/);
  assert.match(result.stdout, /YC8 performance gate passed/);
});

test('fails when a required endpoint or expected sample is missing', () => {
  const samples = completeSamples().filter((sample) => sample.label !== 'GET /api/reports');

  const result = runChecker(samples, oneUserOneLoop);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Sample count 3 != expected 4/);
  assert.match(result.stderr, /GET \/api\/reports: samples 0 != expected 1/);
});

test('fails a stale result artifact', () => {
  const samples = completeSamples({ base: Date.now() - 2 * 60 * 60 * 1_000 });

  const result = runChecker(samples, [
    '--expected-users', '1',
    '--expected-loops', '1',
    '--max-artifact-age-minutes', '1',
    '--min-throughput', '0'
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Artifact age .* minutes > 1 minutes/);
});

test('fails a slow endpoint even when aggregate P95 remains below the threshold', () => {
  const samples = completeSamples({ loops: 10 });
  samples[0].elapsed = 2_500;

  const result = runChecker(samples, [
    '--expected-users', '1',
    '--expected-loops', '10',
    '--max-artifact-age-minutes', '5',
    '--min-throughput', '0'
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /"p95Ms": 10/);
  assert.match(result.stderr, /POST \/api\/auth\/login: P95 2500ms > 2000ms/);
});

test('uses a non-zero default minimum throughput', () => {
  const base = Date.now() - 12_000;
  const samples = completeSamples({ base });
  samples[3].timeStamp = base + 10_000;

  const result = runChecker(samples, [
    '--expected-users', '1',
    '--expected-loops', '1',
    '--max-artifact-age-minutes', '5'
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Overall throughput .*\/s < 10\/s/);
});

test('rejects malformed rows instead of silently discarding evidence', () => {
  const result = runChecker(completeSamples(), oneUserOneLoop, ['invalid,10,GET /api/health,true']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid JTL sample.*line 6/);
});

test('rejects duplicate headers instead of allowing the last success column to mask failures', () => {
  const result = runChecker([], oneUserOneLoop, completeSamples().map((sample) =>
    [sample.timeStamp, sample.elapsed, sample.label, false, true].join(',')),
  'timeStamp,elapsed,label,success,success');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid JTL header.*duplicate/);
});

test('accepts a valid quoted multiline JTL field without splitting a sample into multiple rows', () => {
  const rows = completeSamples().map((sample) =>
    `${sample.timeStamp},${sample.elapsed},${sample.label},true,"message line 1\nmessage line 2, with ""quotes"""`);
  const result = runChecker([], oneUserOneLoop, rows, 'timeStamp,elapsed,label,success,failureMessage');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"samples": 4/);
});

test('counts a failed sample with a quoted multiline message as an error', () => {
  const rows = completeSamples().map((sample, index) =>
    `${sample.timeStamp},${sample.elapsed},${sample.label},${index !== 1},"request failed\ntransaction expired"`);
  const result = runChecker([], oneUserOneLoop, rows, 'timeStamp,elapsed,label,success,failureMessage');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GET \/api\/health: error rate 100.00%/);
});

test('rejects an empty duration instead of converting it to zero', () => {
  const samples = completeSamples();
  samples[0].elapsed = '';
  const result = runChecker(samples, oneUserOneLoop);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid JTL sample.*line 2/);
});

test('rejects unknown success values even if a permissive error threshold is used', () => {
  const samples = completeSamples();
  samples[0].success = 'unknown';
  const result = runChecker(samples, [...oneUserOneLoop, '--max-error-rate', '100']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid JTL sample.*line 2/);
});

for (const success of ['tr"ue"', '"true"junk']) {
  test(`rejects malformed CSV quoting in success field ${success}`, () => {
    const samples = completeSamples();
    samples[0].success = success;
    const result = runChecker(samples, oneUserOneLoop);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Invalid JTL sample.*line 2/);
  });
}

test('rejects future artifacts that cannot be evidence of a completed load run', () => {
  const result = runChecker(completeSamples({ base: Date.now() + 60 * 60 * 1000 }), oneUserOneLoop);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /future/i);
});

test('compares the raw average with the threshold before display rounding', () => {
  const samples = completeSamples({ loops: 2 });
  samples[0].elapsed = 11; // 71 / 7 = 10.142857..., displayed as 10.14.
  const result = runChecker(samples, [
    '--expected-users', '1', '--expected-loops', '2',
    '--max-artifact-age-minutes', '5', '--min-throughput', '0', '--max-average', '10.142'
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Overall average/);
});

test('compares the raw endpoint error rate with the threshold before display rounding', () => {
  const samples = completeSamples({ loops: 101 });
  samples[1].success = false; // 1 / 101 = 0.990099...%, displayed as 0.99%.
  const result = runChecker(samples, [
    '--expected-users', '1', '--expected-loops', '101',
    '--max-artifact-age-minutes', '5', '--min-throughput', '0', '--max-error-rate', '0.99'
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GET \/api\/health: error rate/);
});

test('compares the raw throughput with the threshold before display rounding', () => {
  const base = Date.now() - 5000;
  const samples = completeSamples({ base });
  samples[3].timeStamp = base + 390;
  samples[3].elapsed = 11; // 4 / 0.401 = 9.975..., displayed as 9.98.
  const result = runChecker(samples, [
    '--expected-users', '1', '--expected-loops', '1',
    '--max-artifact-age-minutes', '5', '--min-throughput', '9.979'
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Overall throughput/);
});
