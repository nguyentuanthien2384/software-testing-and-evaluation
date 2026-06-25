<#
.SYNOPSIS
  Chạy YC7 - Selenium WebDriver UI test trên Windows (PowerShell).

.DESCRIPTION
  Script giả định app đã chạy sẵn (npm run dev hoặc npm run start) tại BaseUrl.
  Cài dependencies test nếu thiếu, sau đó chạy mocha + xuất JUnit XML.

.EXAMPLE
  ./scripts/run-yc7.ps1
  ./scripts/run-yc7.ps1 -BaseUrl http://127.0.0.1:3000 -Browser chrome
  ./scripts/run-yc7.ps1 -Headless:$false   # mở trình duyệt thật để xem
#>
param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [ValidateSet("chrome", "firefox", "edge")]
  [string]$Browser = "chrome",
  [bool]$Headless = $true
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$seleniumDir = Join-Path $projectRoot "tests\selenium-js"

Write-Host "==> YC7 Selenium" -ForegroundColor Cyan
Write-Host "    BaseUrl : $BaseUrl"
Write-Host "    Browser : $Browser"
Write-Host "    Headless: $Headless"

# Kiểm tra app có đang chạy không.
try {
  $health = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -TimeoutSec 10
  Write-Host "    App health: $($health.StatusCode)" -ForegroundColor Green
} catch {
  Write-Error "Không gọi được $BaseUrl/api/health. Hãy chạy app trước: cd source/teacher-payroll-app; npm run dev"
  exit 1
}

Set-Location $seleniumDir
if (-not (Test-Path "node_modules")) {
  Write-Host "==> Cài dependencies Selenium..." -ForegroundColor Cyan
  npm install --package-lock=false --no-audit --no-fund
}

$env:BASE_URL = $BaseUrl
$env:BROWSER = $Browser
$env:HEADLESS = if ($Headless) { "true" } else { "false" }
$env:SCREENSHOT_DIR = Join-Path $projectRoot "evidence\screenshots"

Write-Host "==> Chạy test (JUnit XML)..." -ForegroundColor Cyan
npm run test:junit
$exit = $LASTEXITCODE

Write-Host ""
Write-Host "==> Kết quả:" -ForegroundColor Cyan
Write-Host "    JUnit XML : tests/selenium-js/reports/junit/yc7-selenium-results.xml"
Write-Host "    Screenshot: evidence/screenshots (khi test fail)"
exit $exit
