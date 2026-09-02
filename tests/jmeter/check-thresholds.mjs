#!/usr/bin/env node
import fs from 'node:fs';

const DEFAULT_REQUIRED_LABELS = [
  'POST /api/auth/login',
  'GET /api/health',
  'POST /api/payroll',
  'GET /api/reports'
];

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

function percentile(sortedValues, percentileValue) {
  return sortedValues[Math.ceil(sortedValues.length * percentileValue) - 1];
}

function summarize(samples, durationSeconds) {
  const elapsedValues = samples.map((sample) => sample.elapsed).sort((a, b) => a - b);
  const avg = elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length;
  const failed = samples.filter((sample) => !sample.success).length;
  return {
    samples: samples.length,
    avgMs: Number(avg.toFixed(2)),
    p95Ms: percentile(elapsedValues, 0.95),
    errorRatePercent: Number(((failed / samples.length) * 100).toFixed(2)),
    throughputPerSecond: Number((samples.length / durationSeconds).toFixed(2))
  };
}

function validateNonNegativeNumber(name, value, errors) {
  if (!Number.isFinite(value) || value < 0) errors.push(`${name} phải là số không âm.`);
}

function expectedCountForLabel(label, users, loops) {
  return label === 'POST /api/auth/login' ? users : users * loops;
}

const resultFile = readArg('--file', 'evidence/jmeter-results/yc8-payroll-results.jtl');
const maxAverage = Number(readArg('--max-average', process.env.MAX_AVERAGE_MS || '1000'));
const maxP95 = Number(readArg('--max-p95', process.env.MAX_P95_MS || '2000'));
const maxErrorRate = Number(readArg('--max-error-rate', process.env.MAX_ERROR_RATE || '1'));
const minThroughput = Number(readArg('--min-throughput', process.env.MIN_THROUGHPUT || '10'));
const expectedUsers = Number(readArg('--expected-users', process.env.JMETER_USERS || '50'));
const expectedLoops = Number(readArg('--expected-loops', process.env.JMETER_LOOPS || '10'));
const maxArtifactAgeMinutes = Number(readArg(
  '--max-artifact-age-minutes',
  process.env.MAX_ARTIFACT_AGE_MINUTES || '60'
));
const requiredLabels = Array.from(new Set(
  readArg('--required-labels', process.env.REQUIRED_JMETER_LABELS || DEFAULT_REQUIRED_LABELS.join(','))
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
));

const configurationErrors = [];
validateNonNegativeNumber('max-average', maxAverage, configurationErrors);
validateNonNegativeNumber('max-p95', maxP95, configurationErrors);
validateNonNegativeNumber('max-error-rate', maxErrorRate, configurationErrors);
validateNonNegativeNumber('min-throughput', minThroughput, configurationErrors);
validateNonNegativeNumber('max-artifact-age-minutes', maxArtifactAgeMinutes, configurationErrors);
if (!Number.isInteger(expectedUsers) || expectedUsers <= 0) {
  configurationErrors.push('expected-users phải là số nguyên lớn hơn 0.');
}
if (!Number.isInteger(expectedLoops) || expectedLoops <= 0) {
  configurationErrors.push('expected-loops phải là số nguyên lớn hơn 0.');
}
if (requiredLabels.length === 0) configurationErrors.push('required-labels không được để trống.');
if (configurationErrors.length > 0) {
  console.error(`Cấu hình gate JMeter không hợp lệ:\n- ${configurationErrors.join('\n- ')}`);
  process.exit(2);
}

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
headers[0] = headers[0].replace(/^\uFEFF/, '');
const index = Object.fromEntries(headers.map((header, i) => [header, i]));
const requiredColumns = ['timeStamp', 'elapsed', 'label', 'success'];
for (const column of requiredColumns) {
  if (!(column in index)) {
    console.error(`Missing required JTL column: ${column}`);
    process.exit(2);
  }
}

const samples = lines.slice(1).map(parseCsvLine).map((row) => ({
  timeStamp: Number(row[index.timeStamp]),
  elapsed: Number(row[index.elapsed]),
  label: row[index.label]?.trim() ?? '',
  success: row[index.success] === 'true'
})).filter((sample) => (
  Number.isFinite(sample.timeStamp)
  && Number.isFinite(sample.elapsed)
  && sample.elapsed >= 0
  && sample.label.length > 0
));

if (samples.length === 0) {
  console.error('No valid JMeter samples found.');
  process.exit(2);
}

const firstStart = Math.min(...samples.map((sample) => sample.timeStamp));
const latestEnd = Math.max(...samples.map((sample) => sample.timeStamp + sample.elapsed));
const durationSeconds = Math.max((latestEnd - firstStart) / 1000, 0.001);
const artifactAgeMinutes = (Date.now() - latestEnd) / 60000;
const aggregate = summarize(samples, durationSeconds);
const samplesByLabel = new Map();
for (const sample of samples) {
  const current = samplesByLabel.get(sample.label) ?? [];
  current.push(sample);
  samplesByLabel.set(sample.label, current);
}

const endpointMetrics = Object.fromEntries(requiredLabels.map((label) => {
  const labelSamples = samplesByLabel.get(label) ?? [];
  return [label, labelSamples.length > 0 ? summarize(labelSamples, durationSeconds) : null];
}));

const expectedLabelCounts = Object.fromEntries(requiredLabels.map((label) => [
  label,
  expectedCountForLabel(label, expectedUsers, expectedLoops)
]));
const expectedSamples = Object.values(expectedLabelCounts).reduce((sum, value) => sum + value, 0);

const summary = {
  ...aggregate,
  durationSeconds: Number(durationSeconds.toFixed(3)),
  latestSampleAt: new Date(latestEnd).toISOString(),
  artifactAgeMinutes: Number(artifactAgeMinutes.toFixed(2)),
  expectedSamples,
  expectedLabelCounts,
  endpointMetrics,
  thresholds: {
    maxAverage,
    maxP95,
    maxErrorRate,
    minThroughput,
    maxArtifactAgeMinutes
  }
};

console.log(JSON.stringify(summary, null, 2));

const failures = [];
if (samples.length !== expectedSamples) {
  failures.push(`Sample count ${samples.length} != expected ${expectedSamples}`);
}
for (const label of requiredLabels) {
  const actual = samplesByLabel.get(label)?.length ?? 0;
  const expected = expectedLabelCounts[label];
  if (actual !== expected) failures.push(`${label}: samples ${actual} != expected ${expected}`);
}
if (maxArtifactAgeMinutes > 0 && artifactAgeMinutes > maxArtifactAgeMinutes) {
  failures.push(`Artifact age ${artifactAgeMinutes.toFixed(2)} minutes > ${maxArtifactAgeMinutes} minutes`);
}
if (aggregate.avgMs > maxAverage) failures.push(`Overall average ${aggregate.avgMs.toFixed(2)}ms > ${maxAverage}ms`);
if (aggregate.p95Ms > maxP95) failures.push(`Overall P95 ${aggregate.p95Ms}ms > ${maxP95}ms`);
if (aggregate.errorRatePercent > maxErrorRate) {
  failures.push(`Overall error rate ${aggregate.errorRatePercent.toFixed(2)}% > ${maxErrorRate}%`);
}
if (aggregate.throughputPerSecond < minThroughput) {
  failures.push(`Overall throughput ${aggregate.throughputPerSecond.toFixed(2)}/s < ${minThroughput}/s`);
}

for (const label of requiredLabels) {
  const metrics = endpointMetrics[label];
  if (!metrics) continue;
  if (metrics.avgMs > maxAverage) failures.push(`${label}: average ${metrics.avgMs.toFixed(2)}ms > ${maxAverage}ms`);
  if (metrics.p95Ms > maxP95) failures.push(`${label}: P95 ${metrics.p95Ms}ms > ${maxP95}ms`);
  if (metrics.errorRatePercent > maxErrorRate) {
    failures.push(`${label}: error rate ${metrics.errorRatePercent.toFixed(2)}% > ${maxErrorRate}%`);
  }
}

if (failures.length > 0) {
  console.error(`YC8 performance gate failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('YC8 performance gate passed.');
