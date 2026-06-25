<#
.SYNOPSIS
  Mở Apache JMeter ở chế độ GUI và nạp sẵn test plan YC8.

.DESCRIPTION
  Dùng để test hiệu năng bằng giao diện: bấm nút Start (▶) để chạy,
  xem kết quả trực tiếp qua các Listener (Summary Report, Graph Results...).
  App phải đang chạy tại http://127.0.0.1:3000 trước khi bấm Start.

.EXAMPLE
  ./scripts/open-jmeter-gui.ps1
  ./scripts/open-jmeter-gui.ps1 -JMeterBin "C:\apache-jmeter-5.6.3\bin\jmeter.bat"
#>
param(
  [string]$JMeterBin = "tools\apache-jmeter-5.6.3\bin\jmeter.bat"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$testPlan = Join-Path $projectRoot "tests\jmeter\teacher_payroll_baseline.jmx"

# Cho phép truyền đường dẫn tương đối tính từ gốc dự án.
if (-not (Test-Path $JMeterBin)) {
  $candidate = Join-Path $projectRoot $JMeterBin
  if (Test-Path $candidate) { $JMeterBin = $candidate }
}

if (-not (Get-Command $JMeterBin -ErrorAction SilentlyContinue) -and -not (Test-Path $JMeterBin)) {
  Write-Error "Khong tim thay JMeter ('$JMeterBin'). Truyen -JMeterBin tro toi jmeter.bat."
  exit 1
}

Write-Host "==> Mo JMeter GUI voi test plan:" -ForegroundColor Cyan
Write-Host "    $testPlan"
Write-Host "    Luu y: bao dam app dang chay tai http://127.0.0.1:3000 truoc khi bam Start."

# -t nap test plan; chay GUI (khong co -n).
& $JMeterBin -t $testPlan
