@echo off
setlocal
cd /d "%~dp0"
title NERDCOMMAND - NCI Install

echo.
echo  ===============================================
echo   NERDCOMMAND  ^|  NCI TRADING - INSTALL
echo  ===============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [X] Node.js is not installed.
  echo.
  echo      Download the LTS version from:
  echo        https://nodejs.org
  echo.
  echo      Install it, then double-click this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do echo  [OK] Node.js %%v found
echo.

if not exist "package.json" (
  echo  [X] Wrong folder.
  echo.
  echo      Put this .bat file in your opiontrading folder
  echo      - the one containing package.json - and run it there.
  echo.
  pause
  exit /b 1
)

echo  [1/3] Installing dependencies. This takes a few minutes...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  [X] npm install failed. Copy the red text above and send it to Claude.
  pause
  exit /b 1
)
echo.
echo  [OK] Dependencies installed
echo.

if not exist "setup-nci.js" (
  echo  [X] setup-nci.js is missing from this folder.
  echo      Download it again and put it here.
  pause
  exit /b 1
)

echo  [2/3] Wiring the NCI build...
echo.
call node setup-nci.js
if errorlevel 1 (
  echo.
  echo  [X] Setup failed. Copy the text above and send it to Claude.
  pause
  exit /b 1
)

echo.
echo  [3/3] Done.
echo.
echo  ===============================================
echo   INSTALL COMPLETE
echo  ===============================================
echo.
echo   Now you can double-click:
echo.
echo     START_APP.bat        - open the dashboard
echo     RUN_SIMULATION.bat   - run paper trades
echo.
pause
