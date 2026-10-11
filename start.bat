@echo off
setlocal EnableExtensions
rem ==========================================================================
rem  SideJob - start everything for local development (double-click to run)
rem    1. Start Docker Desktop if it is not running
rem    2. docker compose up -d  (MySQL + Node-RED + phpMyAdmin)
rem    3. npm install in frontend\ only when packages are missing or outdated
rem    4. npm start in a separate window, then open http://localhost:4200
rem  Messages are in English on purpose: Thai text breaks in old cmd consoles.
rem  Loops use goto outside of ( ) blocks because %vars% inside a block are
rem  expanded only once when the block is read. Delays use ping because
rem  timeout fails when the script runs without a console.
rem ==========================================================================

cd /d "%~dp0"
title SideJob - start

set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
set "API_URL=http://localhost:1881/api/health"
set "WEB_URL=http://localhost:4200"

if not exist ".env" (
  echo [!] .env not found. Copy .env.example to .env and fill in the secrets first.
  goto :fail
)

rem ---- 1. Docker -------------------------------------------------------------
docker info >nul 2>&1
if not errorlevel 1 (
  echo [1/4] Docker is running.
  goto :containers
)
if not exist "%DOCKER_EXE%" (
  echo [!] Docker Desktop was not found at "%DOCKER_EXE%".
  goto :fail
)
echo [1/4] Starting Docker Desktop, please wait...
start "" "%DOCKER_EXE%"
set /a tries=0
:wait_docker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>&1
if not errorlevel 1 goto :containers
set /a tries+=1
if %tries% geq 60 (
  echo [!] Docker did not start within 3 minutes. Open Docker Desktop and run start.bat again.
  goto :fail
)
goto :wait_docker

rem ---- 2. Containers ---------------------------------------------------------
:containers
echo [2/4] Starting containers: MySQL, Node-RED, phpMyAdmin...
docker compose up -d
if errorlevel 1 (
  echo [!] docker compose failed. See the messages above.
  goto :fail
)
echo       Waiting for the API on port 1881...
set /a tries=0
:wait_api
set "code=000"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" "%API_URL%"') do set "code=%%c"
if "%code%"=="200" goto :packages
set /a tries+=1
if %tries% geq 40 (
  echo [!] The API did not answer within 2 minutes. Check: docker logs sidejob-nodered
  goto :fail
)
ping -n 4 127.0.0.1 >nul
goto :wait_api

rem ---- 3. Frontend packages --------------------------------------------------
:packages
echo       API is ready.
cd /d "%~dp0frontend"
rem Exit code 1 = node_modules missing or package-lock.json changed since the last install
node -e "const fs=require('fs');let a=fs.statSync('package-lock.json').mtimeMs,b=0;try{b=fs.statSync('node_modules/.package-lock.json').mtimeMs}catch(e){}process.exit(a>b?1:0)"
if not errorlevel 1 (
  echo [3/4] Frontend packages are up to date.
  goto :web
)
echo [3/4] Installing frontend packages with npm install...
call npm install
if errorlevel 1 (
  echo [!] npm install failed. See the messages above.
  goto :fail
)

rem ---- 4. Dev server ---------------------------------------------------------
:web
netstat -ano | findstr /r /c:":4200 .*LISTENING" >nul
if not errorlevel 1 (
  echo [4/4] The web app is already running on port 4200.
  goto :done
)
echo [4/4] Starting the web app in a new window "SideJob Frontend"...
start "SideJob Frontend" /d "%~dp0frontend" cmd /k npm start
set /a tries=0
:wait_web
ping -n 4 127.0.0.1 >nul
set "code=000"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" "%WEB_URL%"') do set "code=%%c"
if "%code%"=="200" goto :done
set /a tries+=1
if %tries% geq 60 (
  echo [!] The web app did not start within 3 minutes. Check the "SideJob Frontend" window.
  goto :fail
)
goto :wait_web

:done
echo.
echo  SideJob is running
echo    Web app     %WEB_URL%
echo    Node-RED    http://localhost:1881
echo    phpMyAdmin  http://localhost:8081
echo.
echo  Keep the "SideJob Frontend" window open while you use the app.
echo  To stop everything, run stop.bat
start "" "%WEB_URL%"
ping -n 9 127.0.0.1 >nul
exit /b 0

:fail
echo.
pause
exit /b 1
