@echo off
echo ========================================
echo  YOURTWIN: CODE - Tunnel Mode Launcher
echo ========================================
echo.

:: Check if localtunnel is installed
where lt >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing localtunnel...
    npm install -g localtunnel
)

echo.
echo Starting tunnels...
echo.
echo Frontend will be at: https://yourtwin-code.loca.lt
echo Backend will be at:  https://yourtwin-api.loca.lt
echo.
echo NOTE: First-time visitors will see a reminder page.
echo       They need to click "Click to Continue" once.
echo.
echo ========================================
echo  Starting Backend Tunnel (Port 5000)
echo ========================================
start "Backend Tunnel" cmd /k "lt --port 5000 --subdomain yourtwin-api"

timeout /t 3 >nul

echo.
echo ========================================
echo  Starting Frontend Tunnel (Port 3000)
echo ========================================
start "Frontend Tunnel" cmd /k "lt --port 3000 --subdomain yourtwin-code"

echo.
echo ========================================
echo  Tunnels are starting in new windows!
echo ========================================
echo.
echo Make sure your servers are running:
echo   - Backend:  cd yourtwin-backend ^&^& npm run dev
echo   - Frontend: cd yourtwin-frontend ^&^& npm run dev
echo.
echo Share these URLs with your friend:
echo   Frontend: https://yourtwin-code.loca.lt
echo   (Backend is automatic via API calls)
echo.
pause
