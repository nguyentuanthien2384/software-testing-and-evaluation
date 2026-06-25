<#
.SYNOPSIS
  Chạy YC8 - JMeter performance test trên Windows (PowerShell).

.DESCRIPTION
  Script giả định app đã chạy sẵn tại Host:Port và máy đã cài JMeter (jmeter.bat).
  Chạy test plan non-GUI, sinh HTML dashboard và chấm ngưỡng bằng check-thresholds.mjs.

.EXAMPLE
  ./scripts/run-yc8.ps1
  ./scripts/run-yc8.ps1 -JMeterBin "C:\apache-jmeter-5.6.3\bin\jmeter.bat"
  ./scripts/run-yc8.ps1 -Users 50 -Ramp 20 -Loops 10
#>
param(
  [string]$JMeterBin = "jmeter.bat",
  [string]$JmeterHost = "127.0.0.1",
  [int]$Port = 3000,
  [string]$Protocol = "http",
  [int]$Users = 50,
  [int]$Ramp = 20,
  [int]$Loops = 10,
  [int]$MaxResponseMs = 2000,
  [int]$MaxAverageMs = 1000,
  [int]$MaxP95Ms = 2000,
  [double]$MaxErrorRate = 1,
  [double]$MinThroughput = 0
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$jmeterDir = Join-Path $projectRoot "tests\jmeter"
$resultDir = Join-Path $projectRoot "evidence\jmeter-results"
$resultFile = Join-Path $resultDir "yc8-payroll-results.jtl"
$htmlDir = Join-Path $resultDir "html-report"

$baseUrl = "${Protocol}://${JmeterHost}:${Port}"

Write-Host "==> YC8 JMeter" -ForegroundColor Cyan
Write-Host "    Target  : $baseUrl"
Write-Host "    Load    : users=$Users ramp=$Ramp loops=$Loops"

# Kiểm tra JMeter.
$jmeterResolved = Get-Command $JMeterBin -ErrorAction SilentlyContinue
if (-not $jmeterResolved) {
  Write-Error "Khong tim thay JMeter ('$JMeterBin'). Cai JMeter roi truyen -JMeterBin 'C:\apache-jmeter-5.6.3\bin\jmeter.bat'."
  exit 1
}

# Kiểm tra app.
try {
  Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 10 | Out-Null
  Write-Host "    App health: OK" -ForegroundColor Green
} catch {
  Write-Error "Khong goi duoc /api/health tai $baseUrl. Hay chay app truoc."
  exit 1
}

New-Item -ItemType Directory -Force -Path $resultDir | Out-Null
if (Test-Path $htmlDir) { Remove-Item -Recurse -Force $htmlDir }
if (Test-Path $resultFile) { Remove-Item -Force $resultFile }

$userProps = Join-Path $jmeterDir "user.properties"
$testPlan = Join-Path $jmeterDir "teacher_payroll_baseline.jmx"
$dataFile = Join-Path $jmeterDir "data\payroll.csv"

Write-Host "==> Chạy JMeter (non-GUI)..." -ForegroundColor Cyan
& $JMeterBin `
  -q $userProps `
  -n `
  -t $testPlan `
  "-Jprotocol=$Protocol" `
  "-Jhost=$JmeterHost" `
  "-Jport=$Port" `
  "-Jusers=$Users" `
  "-Jramp=$Ramp" `
  "-Jloops=$Loops" `
  "-JmaxResponseMs=$MaxResponseMs" `
  "-JdataFile=$dataFile" `
  -l $resultFile `
  -e -o $htmlDir

Write-Host "==> Chấm ngưỡng hiệu năng..." -ForegroundColor Cyan
node (Join-Path $jmeterDir "check-thresholds.mjs") `
  --file $resultFile `
  --max-average $MaxAverageMs `
  --max-p95 $MaxP95Ms `
  --max-error-rate $MaxErrorRate `
  --min-throughput $MinThroughput
$exit = $LASTEXITCODE

Write-Host ""
Write-Host "==> Kết quả:" -ForegroundColor Cyan
Write-Host "    Raw JTL : evidence/jmeter-results/yc8-payroll-results.jtl"
Write-Host "    HTML    : evidence/jmeter-results/html-report/index.html"
exit $exit
