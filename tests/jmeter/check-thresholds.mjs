#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

const resultFile = readArg('--file', 'evidence/jmeter-results/yc8-payroll-results.jtl');
const maxAverage = Number(readArg('--max-average', process.env.MAX_AVERAGE_MS || '1000'));
const maxP95 = Number(readArg('--max-p95', process.env.MAX_P95_MS || '2000'));
const maxErrorRate = Number(readArg('--max-error-rate', process.env.MAX_ERROR_RATE || '1'));
const minThroughput = Number(readArg('--min-throughput', process.env.MIN_THROUGHPUT || '0'));

if (!fs.existsSync(resultFile)) {
  console.error(`JMeter result file not found: ${resultFile}`);
  process.exit(2);
}

const lines = fs.readFileSync(resultFile, 'utf8').trim().split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.error(`JMeter result file has no samples: ${resultFile}`);
  process.exit(2);
}

const headers = parseCsvLine(lines[0]);
const index = Object.fromEntries(headers.map((header, i) => [header, i]));
const required = ['timeStamp', 'elapsed', 'success'];
for (const column of required) {
  if (!(column in index)) {
    console.error(`Missing required JTL column: ${column}`);
    process.exit(2);
  }
}

const samples = lines.slice(1).map(parseCsvLine).map((row) => ({
  timeStamp: Number(row[index.timeStamp]),
  elapsed: Number(row[index.elapsed]),
  success: row[index.success] === 'true'
})).filter((sample) => Number.isFinite(sample.timeStamp) && Number.isFinite(sample.elapsed));

if (samples.length === 0) {
  console.error('No valid JMeter samples found.');
  process.exit(2);
}

const elapsedValues = samples.map((sample) => sample.elapsed).sort((a, b) => a - b);
const avg = elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length;
const p95 = elapsedValues[Math.ceil(elapsedValues.length * 0.95) - 1];
const failed = samples.filter((sample) => !sample.success).length;
const errorRate = (failed / samples.length) * 100;
const first = Math.min(...samples.map((sample) => sample.timeStamp));
const last = Math.max(...samples.map((sample) => sample.timeStamp));
const durationSeconds = Math.max((last - first) / 1000, 1);
const throughput = samples.length / durationSeconds;

const summary = {
  samples: samples.length,
  avgMs: Number(avg.toFixed(2)),
  p95Ms: p95,
  errorRatePercent: Number(errorRate.toFixed(2)),
  throughputPerSecond: Number(throughput.toFixed(2)),
  thresholds: { maxAverage, maxP95, maxErrorRate, minThroughput }
};

console.log(JSON.stringify(summary, null, 2));

const failures = [];
if (avg > maxAverage) failures.push(`Average ${avg.toFixed(2)}ms > ${maxAverage}ms`);
if (p95 > maxP95) failures.push(`P95 ${p95}ms > ${maxP95}ms`);
if (errorRate > maxErrorRate) failures.push(`Error rate ${errorRate.toFixed(2)}% > ${maxErrorRate}%`);
if (throughput < minThroughput) failures.push(`Throughput ${throughput.toFixed(2)}/s < ${minThroughput}/s`);

if (failures.length > 0) {
  console.error(`YC8 performance gate failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('YC8 performance gate passed.');
