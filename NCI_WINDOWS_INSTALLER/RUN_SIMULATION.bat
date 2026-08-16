@echo off
setlocal
cd /d "%~dp0"
title NERDCOMMAND - Paper Trading Simulation

echo.
echo  ===============================================
echo   NERDCOMMAND  ^|  PAPER TRADING SIMULATION
echo  ===============================================
echo.
echo   No real money. No real orders. Simulated only.
echo.

if not exist "node_modules" (
  echo  [X] Not installed yet. Run INSTALL_NCI.bat first.
  echo.
  pause
  exit /b 1
)

set /p DAYS="  How many trading days to simulate? [20]: "
if "%DAYS%"=="" set DAYS=20

echo.
echo   Simulating %DAYS% days...
echo.

call npx tsx runner/month.js %DAYS%

echo.
echo  ===============================================
echo   WHAT TO READ ABOVE
echo  ===============================================
echo.
echo   EXPECTANCY  - average dollars per trade.
echo                 The only number that matters.
echo                 Negative = the system leaks money.
echo.
echo   TRADES      - needs 100+ before it means anything.
echo.
echo   MAX DRAWDOWN- worst peak-to-trough drop.
echo                 Decides if you can stay in the seat.
echo.
echo   Your full trade log is in:  .nci-runner\journal.jsonl
echo.
pause
