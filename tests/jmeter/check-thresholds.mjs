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
  let closedQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        current += char;
      }
    } else if (char === ',') {
      cells.push(current);
      current = '';
      closedQuote = false;
    } else if (char === '"') {
      if (current || closedQuote) throw new Error('CSV quotes must start at the beginning of a field.');
      quoted = true;
    } else {
      if (closedQuote) throw new Error('Unexpected characters after a quoted CSV field.');
      current += char;
    }
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.');
  cells.push(current);
  return cells;
}

function csvRecords(text) {
  const records = [];
  let quoted = false;
  let current = '';
  let line = 1;
  let startLine = 1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        current += '""';
        i += 1;
        continue;
      }
      quoted = !quoted;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (current.trim()) records.push({ text: current, line: startLine });
      current = '';
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      line += 1;
      startLine = line;
    } else {
      current += char;
      if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line += 1;
    }
  }
  if (quoted) throw new Error(`Unclosed quoted CSV field at line ${startLine}.`);
  if (current.trim()) records.push({ text: current, line: startLine });
  return records;
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
    avgMs: avg,
    p95Ms: percentile(elapsedValues, 0.95),
    errorRatePercent: (failed / samples.length) * 100,
    throughputPerSecond: samples.length / durationSeconds
  };
}

function displayMetrics(metrics) {
  if (!metrics) return null;
  return {
    ...metrics,
    avgMs: Number(metrics.avgMs.toFixed(2)),
    errorRatePercent: Number(metrics.errorRatePercent.toFixed(2)),
    throughputPerSecond: Number(metrics.throughputPerSecond.toFixed(2))
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

let lines;
try {
  lines = csvRecords(fs.readFileSync(resultFile, 'utf8'));
} catch (error) {
  console.error(`Invalid JTL CSV: ${error.message}`);
  process.exit(2);
}
if (lines.length < 2) {
  console.error(`JMeter result file has no samples: ${resultFile}`);
  process.exit(2);
}

let headers;
try {
  headers = parseCsvLine(lines[0].text);
} catch (error) {
  console.error(`Invalid JTL header: ${error.message}`);
  process.exit(2);
}
headers[0] = headers[0].replace(/^\uFEFF/, '');
if (headers.some((header) => !header.trim()) || new Set(headers).size !== headers.length) {
  console.error('Invalid JTL header: empty or duplicate column names.');
  process.exit(2);
}
const index = Object.fromEntries(headers.map((header, i) => [header, i]));
const requiredColumns = ['timeStamp', 'elapsed', 'label', 'success'];
for (const column of requiredColumns) {
  if (!(column in index)) {
    console.error(`Missing required JTL column: ${column}`);
    process.exit(2);
  }
}

const samples = [];
for (const line of lines.slice(1)) {
  try {
    const row = parseCsvLine(line.text);
    const timeStampText = row[index.timeStamp]?.trim() ?? '';
    const elapsedText = row[index.elapsed]?.trim() ?? '';
    const sample = {
      timeStamp: Number(timeStampText),
      elapsed: Number(elapsedText),
      label: row[index.label]?.trim() ?? '',
      success: row[index.success] === 'true'
    };
    if (
      row.length !== headers.length || !timeStampText || !elapsedText
      || !Number.isFinite(sample.timeStamp) || sample.timeStamp < 0
      || !Number.isFinite(sample.elapsed) || sample.elapsed < 0
      || !sample.label || !['true', 'false'].includes(row[index.success])
      || !Number.isFinite(sample.timeStamp + sample.elapsed)
      || Math.abs(sample.timeStamp + sample.elapsed) > 8.64e15
    ) throw new Error('Invalid fields.');
    samples.push(sample);
  } catch (error) {
    console.error(`Invalid JTL sample at line ${line.line}: ${error.message}`);
    process.exit(2);
  }
}

if (samples.length === 0) {
  console.error('No valid JMeter samples found.');
  process.exit(2);
}

// Avoid spreading a large load-run artifact into function arguments.
const firstStart = samples.reduce((minimum, sample) => Math.min(minimum, sample.timeStamp), Infinity);
const latestEnd = samples.reduce((maximum, sample) => Math.max(maximum, sample.timeStamp + sample.elapsed), -Infinity);
// Allow one minute of clock skew between the runner and the JMeter host.
if (latestEnd > Date.now() + 60_000) {
  console.error('JMeter artifact contains samples in the future.');
  process.exit(2);
}
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
  ...displayMetrics(aggregate),
  durationSeconds: Number(durationSeconds.toFixed(3)),
  latestSampleAt: new Date(latestEnd).toISOString(),
  artifactAgeMinutes: Number(artifactAgeMinutes.toFixed(2)),
  expectedSamples,
  expectedLabelCounts,
  endpointMetrics: Object.fromEntries(Object.entries(endpointMetrics).map(([label, metrics]) => [label, displayMetrics(metrics)])),
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
