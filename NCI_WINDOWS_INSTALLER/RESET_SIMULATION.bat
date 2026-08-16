@echo off
setlocal
cd /d "%~dp0"
title NERDCOMMAND - Reset Simulation

echo.
echo  ===============================================
echo   RESET PAPER TRADING HISTORY
echo  ===============================================
echo.
echo   This erases all simulated trades and starts
echo   over at $300. Your code is not touched.
echo.
set /p SURE="  Type YES to confirm: "
if /i not "%SURE%"=="YES" (
  echo.
  echo   Cancelled. Nothing was deleted.
  pause
  exit /b 0
)
if exist ".nci-runner" rmdir /s /q ".nci-runner"
echo.
echo   Done. Back to a clean $300 account.
echo.
pause
