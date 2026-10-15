@echo off
rem Mo JMeter GUI voi test plan YC8 da cau hinh san (teacher_payroll_baseline.jmx).
rem Cach dung: scripts\open-jmeter-gui.cmd
rem Truyen them tham so neu muon, vi du: scripts\open-jmeter-gui.cmd -Users 100 -Ramp 30
setlocal
set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%open-jmeter-gui.ps1" %*
endlocal & exit /b %ERRORLEVEL%
