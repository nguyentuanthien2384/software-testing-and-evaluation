import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const powershell = process.env.POWERSHELL_BIN || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runProcess(executable, args, options) {
  const child = spawn(executable, args, { ...options, windowsHide: true });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const timeout = setTimeout(() => child.kill(), 20_000);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', (error) => reject(new Error(
        `Cannot run ${executable}. Install PowerShell or set POWERSHELL_BIN to its executable.`, { cause: error }
      )));
      child.once('close', resolve);
    });
    return { code, output };
  } finally {
    clearTimeout(timeout);
  }
}

async function runFixture({ jmeterExitCode, failedPayroll = false, removeFailFast = false }) {
  // A path with spaces also checks the Windows argument quoting. The runner's
  // evidence deletion and all fixture output stay inside this disposable tree.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yc8 runner regression '));
  const server = http.createServer((request, response) => {
    request.resume();
    response.writeHead(request.url === '/api/health' ? 200 : 404, { 'Content-Type': 'application/json' });
    response.end('{"status":"ok"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    fs.mkdirSync(path.join(directory, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'tests/jmeter'), { recursive: true });
    let runnerSource = fs.readFileSync(path.join(projectDirectory, 'scripts/run-yc8.ps1'), 'utf8');
    if (removeFailFast) {
      // Diagnostic mutation only in the OS temp copy, never the project script.
      runnerSource = runnerSource.replace(/\$jmeterExitCode = \$LASTEXITCODE\r?\nif \(\$jmeterExitCode -ne 0\) \{[\s\S]*?\r?\n\}\r?\n/, '');
    }
    const runner = path.join(directory, 'scripts/run-yc8.ps1');
    fs.writeFileSync(runner, runnerSource);
    fs.copyFileSync(path.join(projectDirectory, 'tests/jmeter/check-thresholds.mjs'), path.join(directory, 'tests/jmeter/check-thresholds.mjs'));
    const fake = path.join(directory, 'fake-jmeter.mjs');
    fs.writeFileSync(fake, `
      import fs from 'node:fs';
      import path from 'node:path';
      const args = process.argv.slice(2);
      const resultFile = args[args.indexOf('-l') + 1];
      const labels = ['POST /api/auth/login', 'GET /api/health', 'POST /api/payroll', 'GET /api/reports'];
      const base = Date.now() - 100;
      fs.mkdirSync(path.dirname(resultFile), { recursive: true });
      fs.writeFileSync(resultFile, 'timeStamp,elapsed,label,success\\n' + labels.map((label, index) =>
        [base + index * 10, 10, label, !(process.env.FAILED_PAYROLL === 'true' && index === 2)].join(',')
      ).join('\\n') + '\\n');
      process.exit(Number(process.env.FAKE_JMETER_EXIT_CODE));
    `);
    const fakeExecutable = path.join(directory, process.platform === 'win32' ? 'fake-jmeter.cmd' : 'fake-jmeter');
    fs.writeFileSync(fakeExecutable, process.platform === 'win32'
      ? `@echo off\r\n"${process.execPath}" "%~dp0fake-jmeter.mjs" %*\r\nexit /b %errorlevel%\r\n`
      : `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(fake)} "$@"\n`);
    if (process.platform !== 'win32') fs.chmodSync(fakeExecutable, 0o755);
    const result = await runProcess(powershell, [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', runner,
      '-JMeterBin', fakeExecutable, '-JmeterHost', '127.0.0.1', '-Port', String(server.address().port),
      '-Users', '1', '-Ramp', '1', '-Loops', '1'
    ], {
      cwd: directory,
      env: { ...process.env, FAKE_JMETER_EXIT_CODE: String(jmeterExitCode), FAILED_PAYROLL: String(failedPayroll) }
    });
    const jtl = fs.readFileSync(path.join(directory, 'evidence/jmeter-results/yc8-payroll-results.jtl'), 'utf8');
    assert.equal(jtl.trim().split('\n').length, 5, 'The failure fixture must produce a complete fresh JTL.');
    return result;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.equal(path.dirname(directory), os.tmpdir(), 'Refuse to remove a directory outside the OS temp root.');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('Windows YC8 runner preserves native JMeter exit 7 even with a complete passing JTL', { timeout: 30_000 }, async () => {
  const result = await runFixture({ jmeterExitCode: 7 });
  assert.equal(result.code, 7, result.output);
  assert.doesNotMatch(result.output, /YC8 performance gate passed/);
  assert.match(result.output, /Performance gate was not run/);
});

test('successful JMeter still runs the real gate and preserves gate failures', { timeout: 30_000 }, async () => {
  const result = await runFixture({ jmeterExitCode: 0, failedPayroll: true });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /YC8 performance gate failed/);
  assert.match(result.output, /POST \/api\/payroll: error rate 100\.00%/);
});

test('removing fail-fast from only the temporary runner copy reproduces the previous false pass', { timeout: 30_000 }, async () => {
  const result = await runFixture({ jmeterExitCode: 7, removeFailFast: true });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /YC8 performance gate passed/);
});
