@echo off
setlocal EnableExtensions
rem ==========================================================================
rem  SideJob - share the web app through a temporary public link (double-click)
rem    1. Make sure the API (Node-RED on port 1881) is up; starts the containers if needed
rem    2. Start the web app in share mode on port 4300 (npm run share) in its own window
rem    3. Open a Cloudflare Quick Tunnel and print the https://....trycloudflare.com link
rem  The link works only while this window is open. Ctrl+C or closing it ends the link
rem  and stops the share-mode web window. Every run gives a new link.
rem  Only the app, /api, /uploads and the chat socket are reachable through the link
rem  (see frontend/proxy.share.mjs); the Node-RED editor and phpMyAdmin are not.
rem  Messages are in English on purpose: Thai text breaks in old cmd consoles.
rem ==========================================================================

cd /d "%~dp0"
title SideJob - share link

set "API_URL=http://localhost:1881/api/health"
set "SHARE_URL=http://localhost:4300"
set "WEB_TITLE=SideJob Share Web"

set "CLOUDFLARED=cloudflared"
where cloudflared >nul 2>&1
if not errorlevel 1 goto :api
set "CLOUDFLARED=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if exist "%CLOUDFLARED%" goto :api
set "CLOUDFLARED=%ProgramFiles%\cloudflared\cloudflared.exe"
if exist "%CLOUDFLARED%" goto :api
echo [!] cloudflared was not found. Install it with:
echo       winget install --id Cloudflare.cloudflared -e
goto :fail

rem ---- 1. API -----------------------------------------------------------------
:api
set "code=000"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" "%API_URL%"') do set "code=%%c"
if "%code%"=="200" (
  echo [1/3] API is running.
  goto :web
)
docker info >nul 2>&1
if errorlevel 1 (
  echo [!] Docker is not running. Run start.bat first, then run share.bat again.
  goto :fail
)
echo [1/3] Starting containers: MySQL, Node-RED, phpMyAdmin...
docker compose up -d
if errorlevel 1 (
  echo [!] docker compose failed. See the messages above.
  goto :fail
)
set /a tries=0
:wait_api
ping -n 4 127.0.0.1 >nul
set "code=000"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" "%API_URL%"') do set "code=%%c"
if "%code%"=="200" goto :web
set /a tries+=1
if %tries% geq 40 (
  echo [!] The API did not answer within 2 minutes. Check: docker logs sidejob-nodered
  goto :fail
)
goto :wait_api

rem ---- 2. Web app in share mode ------------------------------------------------
:web
netstat -ano | findstr /r /c:":4300 .*LISTENING" >nul
if not errorlevel 1 (
  echo [2/3] The share-mode web app is already running on port 4300.
  goto :tunnel
)
echo [2/3] Starting the web app in share mode in a new window "%WEB_TITLE%"...
start "%WEB_TITLE%" /d "%~dp0frontend" cmd /k npm run share
set /a tries=0
:wait_web
ping -n 4 127.0.0.1 >nul
set "code=000"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" "%SHARE_URL%"') do set "code=%%c"
if "%code%"=="200" goto :tunnel
set /a tries+=1
if %tries% geq 60 (
  echo [!] The web app did not start within 3 minutes. Check the "%WEB_TITLE%" window.
  goto :fail
)
goto :wait_web

rem ---- 3. Tunnel --------------------------------------------------------------
:tunnel
echo [3/3] Opening the public link...
echo.
echo  Look for the line with https://....trycloudflare.com below (inside the box)
echo  and send that link. Sign in with an email account (the Google button is hidden).
echo  Keep this window open while people use it. Press Ctrl+C to stop sharing.
echo.
"%CLOUDFLARED%" tunnel --no-autoupdate --url %SHARE_URL%

echo.
echo  Sharing stopped. The link no longer works.
taskkill /fi "WINDOWTITLE eq %WEB_TITLE%*" /t /f >nul 2>&1
ping -n 3 127.0.0.1 >nul
exit /b 0

:fail
echo.
pause
exit /b 1
