@echo off
setlocal
cd /d "%~dp0"
title NERDCOMMAND - Dashboard

echo.
echo  ===============================================
echo   NERDCOMMAND  ^|  OPTIONSCOPE DASHBOARD
echo  ===============================================
echo.

if not exist "node_modules" (
  echo  [X] Not installed yet. Run INSTALL_NCI.bat first.
  echo.
  pause
  exit /b 1
)

echo   Starting the server...
echo.
echo   Your browser will open in about 15 seconds.
echo   If it does not, go to:  http://localhost:3000/dashboard
echo.
echo   KEEP THIS WINDOW OPEN while you use the app.
echo   Close it or press Ctrl+C when you are done.
echo.

start "" /b cmd /c "timeout /t 15 /nobreak >nul & start http://localhost:3000/dashboard"

call npm run dev

echo.
echo   Server stopped.
pause
