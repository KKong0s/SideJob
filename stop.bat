@echo off
setlocal EnableExtensions
rem ==========================================================================
rem  SideJob - stop everything started by start.bat
rem    - stops the web app on port 4200 (and closes its cmd window)
rem    - stops the SideJob containers; MySQL data is kept
rem  Other Docker stacks on this machine are not touched.
rem ==========================================================================

cd /d "%~dp0"
title SideJob - stop

echo [1/2] Stopping the web app on port 4200...
rem npm renames its window, so find the process by port instead of by title.
rem Walk up at most 3 parents to also close the cmd window that start.bat opened.
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $c) { exit 2 }; $target = $c.OwningProcess; $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $target); for ($i = 0; $i -lt 3 -and $p; $i++) { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $p.ParentProcessId); if ($p -and $p.Name -eq 'cmd.exe') { $target = $p.ProcessId; break } }; taskkill /pid $target /t /f | Out-Null; exit 0"
if errorlevel 2 (
  echo       The web app was not running.
) else (
  echo       Stopped.
)

echo [2/2] Stopping SideJob containers...
docker info >nul 2>&1
if errorlevel 1 (
  echo       Docker is not running, nothing to stop.
  goto :done
)
docker compose stop

:done
echo.
echo  SideJob stopped. Run start.bat to start it again.
ping -n 6 127.0.0.1 >nul
