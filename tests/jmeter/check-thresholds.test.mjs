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

function runChecker(samples, args = []) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jmeter-checker-'));
  const resultFile = path.join(temporaryDirectory, 'result.jtl');
  const rows = [
    'timeStamp,elapsed,label,success',
    ...samples.map((sample) => [sample.timeStamp, sample.elapsed, sample.label, sample.success].join(','))
  ];
  fs.writeFileSync(resultFile, `${rows.join('\n')}\n`, 'utf8');
  try {
    return spawnSync(process.execPath, [checker, '--file', resultFile, ...args], {
      encoding: 'utf8',
      env: { ...process.env }
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
