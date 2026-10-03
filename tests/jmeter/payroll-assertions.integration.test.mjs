import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(testDirectory, '../..');
const jmeterHome = process.env.JMETER_HOME || path.join(projectDirectory, 'tools/apache-jmeter-5.6.3');
const jmeterJar = path.join(jmeterHome, 'bin/ApacheJMeter.jar');
assert.ok(fs.existsSync(jmeterJar), 'Install Apache JMeter and set JMETER_HOME before running assertion integration tests.');
const responses = [
  ['correct', '{"convertedHours":40.5,"amount":11583000}', true],
  ['equivalent decimal scale', '{"convertedHours":40.50,"amount":11583000.0}', true],
  ['ten times the expected amount', '{"convertedHours":40.5,"amount":115830000}', false],
  ['extra decimal digits', '{"convertedHours":40.59,"amount":11583000}', false],
  ['numeric strings', '{"convertedHours":"40.5","amount":"11583000"}', false],
  ['missing amount', '{"convertedHours":40.5}', false],
  ['malformed JSON', '{"convertedHours":40.5,', false]
];

async function runJava(args, cwd) {
  const child = spawn(process.env.JAVA_BIN || 'java', args, { cwd, windowsHide: true });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const timeout = setTimeout(() => child.kill(), 60_000);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    assert.equal(code, 0, output);
  } finally {
    clearTimeout(timeout);
  }
}

for (const plan of ['teacher_payroll_baseline.jmx', 'teacher_payroll_load_test.jmx']) {
  test(`${plan}: actual JMeter assertions accept exact JSON and reject incorrect numeric responses`, {
    timeout: 70_000
  }, async () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jmeter-payroll-oracle-'));
    let payrollRequests = 0;
    const server = http.createServer((request, response) => {
      request.resume();
      response.writeHead(200, { 'Content-Type': 'application/json' });
      if (request.url === '/api/payroll') {
        response.end(responses[payrollRequests++]?.[1] || '{}');
      } else if (request.url === '/api/auth/login') {
        response.end('{"ok":true,"user":{"username":"tester","role":"tester"}}');
      } else if (request.url === '/api/health') {
        response.end('{"status":"ok","service":"teacher-payroll-app","version":"3.0.0"}');
      } else {
        response.end('{"count":0,"totalAmount":0,"lines":[]}');
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const resultFile = path.join(temporaryDirectory, 'results.xml');
      const dataFile = path.join(temporaryDirectory, 'payroll.csv');
      fs.writeFileSync(dataFile,
        'hours,subjectCoef,classCoef,rate,degreeCoef,expectedConvertedHours,expectedAmount\n45,1,0.9,143000,2,40.5,11583000\n');
      await runJava([
        '-Xms64m', '-Xmx256m', '-jar', jmeterJar,
        '-n', '-t', path.join(testDirectory, plan),
        '-Jprotocol=http', '-Jhost=127.0.0.1', `-Jport=${server.address().port}`,
        '-Jusers=1', '-Jramp=1', `-Jloops=${responses.length}`, '-JmaxResponseMs=10000',
        `-JdataFile=${dataFile}`, '-Jjmeter.save.saveservice.output_format=xml',
        '-l', resultFile, '-j', path.join(temporaryDirectory, 'jmeter.log')
      ], temporaryDirectory);
      const xml = fs.readFileSync(resultFile, 'utf8');
      const sampleTags = xml.match(/<httpSample\b[^>]*>/g) || [];
      const payroll = sampleTags.filter((tag) => /\blb="POST \/api\/payroll"/.test(tag));
      assert.equal(payroll.length, responses.length, xml);
      for (const [index, [name, , success]] of responses.entries()) {
        assert.equal(/\bs="true"/.test(payroll[index]), success, `${name}\n${xml}`);
      }
      for (const tag of sampleTags.filter((tag) => !/\blb="POST \/api\/payroll"/.test(tag))) {
        assert.match(tag, /\bs="true"/, `Unrelated HTTP fixture failed: ${tag}`);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
      assert.equal(path.dirname(temporaryDirectory), os.tmpdir(), 'Refuse to clean up an unexpected test directory.');
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
}
