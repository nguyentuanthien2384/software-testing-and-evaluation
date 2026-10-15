<#
.SYNOPSIS
  Mo Apache JMeter o che do GUI va nap san test plan YC8 da cau hinh trong du an.

.DESCRIPTION
  Dung de test hieu nang bang giao dien: bam nut Start (>) de chay,
  xem ket qua truc tiep qua cac Listener (Summary Report, View Results Tree...).
  Test plan duoc nap kem user.properties va cac tham so -J giong het run-yc8.ps1,
  nen khi bam Start, cau hinh chay trung khop voi luot chay non-GUI cua YC8.
  Luu y: App phai dang chay tai Host:Port truoc khi bam Start.
  Neu muon them View Results Tree / Summary Report, bam chuot phai vao
  "YC8 Teacher Payroll Baseline Performance Test" > Add > Listener.

.EXAMPLE
  ./scripts/open-jmeter-gui.ps1
  ./scripts/open-jmeter-gui.ps1 -JMeterBin "C:\apache-jmeter-5.6.3\bin\jmeter.bat"
  ./scripts/open-jmeter-gui.ps1 -Users 100 -Ramp 30 -Loops 5
#>
param(
  [string]$JMeterBin = "tools\apache-jmeter-5.6.3\bin\jmeter.bat",
  [string]$JmeterHost = "127.0.0.1",
  [int]$Port = 3000,
  [string]$Protocol = "http",
  [int]$Users = 50,
  [int]$Ramp = 20,
  [int]$Loops = 10,
  [int]$MaxResponseMs = 2000,
  [string]$TestPlan = "tests\jmeter\teacher_payroll_baseline.jmx"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$testPlanPath = Join-Path $projectRoot $TestPlan
$userProps = Join-Path $projectRoot "tests\jmeter\user.properties"
$dataFile = Join-Path $projectRoot "tests\jmeter\data\payroll.csv"

# Cho phép truyền đường dẫn tương đối tính từ gốc dự án.
if (-not (Test-Path $JMeterBin)) {
  $candidate = Join-Path $projectRoot $JMeterBin
  if (Test-Path $candidate) { $JMeterBin = $candidate }
}

if (-not (Get-Command $JMeterBin -ErrorAction SilentlyContinue) -and -not (Test-Path $JMeterBin)) {
  Write-Error "Khong tim thay JMeter ('$JMeterBin'). Truyen -JMeterBin tro toi jmeter.bat."
  exit 1
}

if (-not (Test-Path $testPlanPath)) {
  Write-Error "Khong tim thay test plan ('$testPlanPath')."
  exit 1
}

Write-Host "==> Mo JMeter GUI voi test plan YC8:" -ForegroundColor Cyan
Write-Host "    Test plan : $testPlanPath"
Write-Host "    Config    : users=$Users ramp=$Ramp loops=$Loops target=${Protocol}://${JmeterHost}:${Port}"
Write-Host "    Luu y: bao dam app dang chay tai ${Protocol}://${JmeterHost}:${Port} truoc khi bam Start."
Write-Host "    Sau khi mo: nhan Start (>) de chay; them Listener (View Results Tree, Summary Report)"
Write-Host "    bang chuot phai vao Test Plan > Add > Listener neu muon xem ket qua chi tiet."

# -q nap user.properties (dinh dang JTL CSV, apdex...); -J dat cac tham so giong run-yc8.ps1.
# -JdataFile dung duong dan tuyet doi vi CSV Dataset Config trong jmx dung path tuong doi.
# Khong co -n nen JMeter mo o che do GUI va dung o day cho den khi nguoi dung dong cua so.
& $JMeterBin `
  -q $userProps `
  -t $testPlanPath `
  "-Jprotocol=$Protocol" `
  "-Jhost=$JmeterHost" `
  "-Jport=$Port" `
  "-Jusers=$Users" `
  "-Jramp=$Ramp" `
  "-Jloops=$Loops" `
  "-JmaxResponseMs=$MaxResponseMs" `
  "-JdataFile=$dataFile"

exit $LASTEXITCODE
