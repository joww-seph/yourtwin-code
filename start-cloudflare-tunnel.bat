@echo off
echo ================================================
echo  YOURTWIN: CODE - Cloudflare Tunnel Setup
echo ================================================
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo cloudflared not found! Installing...
    echo.
    echo Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo Or run: winget install Cloudflare.cloudflared
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  STEP 1: Starting Backend Tunnel (Port 5000)
echo ================================================
echo.
echo Starting backend tunnel... Copy the URL that appears!
echo.
start "Backend Tunnel" cmd /k "cloudflared tunnel --url http://localhost:5000"

echo.
echo Waiting for backend tunnel to start...
timeout /t 5 >nul

echo.
echo ================================================
echo  STEP 2: Copy the Backend URL
echo ================================================
echo.
echo Look at the "Backend Tunnel" window.
echo Copy the URL that looks like:
echo   https://something-random.trycloudflare.com
echo.
echo Then update yourtwin-frontend\.env with:
echo   VITE_API_URL=https://YOUR-BACKEND-URL/api
echo.
echo Press any key after you've updated the .env file...
pause >nul

echo.
echo ================================================
echo  STEP 3: Starting Frontend Tunnel (Port 3000)
echo ================================================
echo.
start "Frontend Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo ================================================
echo  DONE! Share the Frontend URL with your friend
echo ================================================
echo.
echo Look at the "Frontend Tunnel" window for the URL.
echo Share that URL (https://something.trycloudflare.com)
echo.
echo Make sure both servers are running:
echo   - Backend:  cd yourtwin-backend ^& npm run dev
echo   - Frontend: cd yourtwin-frontend ^& npm run dev
echo.
pause
