@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title YOURTWIN: CODE - Cloudflare Tunnel

:: ============================================
:: YOURTWIN: CODE - Cloudflare Tunnel Setup
:: Creates secure tunnels for remote access
:: ============================================

echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║    YOURTWIN: CODE - Cloudflare Tunnel Setup        ║
echo  ║                                                    ║
echo  ║    Creates public URLs to access your local app   ║
echo  ║    securely from anywhere in the world.           ║
echo  ╚════════════════════════════════════════════════════╝
echo.

:: ============================================
:: CHECK 1: Cloudflared Installation
:: ============================================
echo [1/5] Checking cloudflared installation...

where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo       [WARNING] cloudflared not found!
    echo.
    echo       Installation options:
    echo.
    echo       Option 1 - Using winget (recommended):
    echo         winget install Cloudflare.cloudflared
    echo.
    echo       Option 2 - Using Chocolatey:
    echo         choco install cloudflared
    echo.
    echo       Option 3 - Manual download:
    echo         https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo.
    echo       After installing, restart this terminal and run again.
    echo.

    set /p install_choice="Try to install with winget now? (yes/no): "
    if /i "!install_choice!"=="yes" (
        echo.
        echo Installing cloudflared...
        winget install Cloudflare.cloudflared
        if !errorlevel! neq 0 (
            echo.
            echo Installation failed! Please install manually.
            pause
            exit /b 1
        )
        echo.
        echo [OK] cloudflared installed. Restarting script...
        timeout /t 2 >nul
        call "%~f0"
        exit /b 0
    ) else (
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%v in ('cloudflared --version 2^>nul') do set CF_VERSION=%%v
echo       [OK] %CF_VERSION%

:: ============================================
:: CHECK 2: Local Servers
:: ============================================
echo.
echo [2/5] Checking local servers...

set BACKEND_RUNNING=0
set FRONTEND_RUNNING=0

netstat -ano 2>nul | findstr ":5000.*LISTENING" >nul
if %errorlevel% equ 0 set BACKEND_RUNNING=1

netstat -ano 2>nul | findstr ":3000.*LISTENING" >nul
if %errorlevel% equ 0 set FRONTEND_RUNNING=1

if %BACKEND_RUNNING% equ 0 (
    echo       [WARNING] Backend not running on port 5000!
)
if %FRONTEND_RUNNING% equ 0 (
    echo       [WARNING] Frontend not running on port 3000!
)

if %BACKEND_RUNNING% equ 0 if %FRONTEND_RUNNING% equ 0 (
    echo.
    echo       No servers detected. Would you like to start them?
    echo.
    echo       1. Start servers now (run start.bat)
    echo       2. Continue anyway (I'll start them manually)
    echo       3. Exit
    echo.
    set /p server_choice="Choose (1-3): "

    if "!server_choice!"=="1" (
        echo.
        echo Starting servers...
        call "%~dp0start.bat"
        echo.
        echo Waiting for servers to initialize...
        timeout /t 8 >nul

        :: Re-check servers
        netstat -ano 2>nul | findstr ":5000.*LISTENING" >nul
        if !errorlevel! equ 0 set BACKEND_RUNNING=1
        netstat -ano 2>nul | findstr ":3000.*LISTENING" >nul
        if !errorlevel! equ 0 set FRONTEND_RUNNING=1
    ) else if "!server_choice!"=="3" (
        echo Cancelled.
        pause
        exit /b 0
    )
)

if %BACKEND_RUNNING% equ 1 (
    echo       [OK] Backend running on port 5000
) else (
    echo       [!] Backend not detected - tunnel may not work
)

if %FRONTEND_RUNNING% equ 1 (
    echo       [OK] Frontend running on port 3000
) else (
    echo       [!] Frontend not detected - tunnel may not work
)

:: ============================================
:: STEP 3: Start Backend Tunnel
:: ============================================
echo.
echo [3/5] Starting Backend Tunnel...
echo.
echo       Creating tunnel to http://localhost:5000
echo       A new window will open. Watch for the public URL.
echo.

:: Create a temp script to capture the URL
set "BACKEND_URL_FILE=%TEMP%\yourtwin_backend_url.txt"
del "%BACKEND_URL_FILE%" 2>nul

:: Start backend tunnel in a new window
start "YOURTWIN Backend Tunnel" cmd /k "echo Connecting to Cloudflare... && cloudflared tunnel --url http://localhost:5000 2>&1 | tee CON"

echo       Waiting for tunnel to establish...
timeout /t 8 >nul

echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║            BACKEND TUNNEL STARTED                  ║
echo  ╠════════════════════════════════════════════════════╣
echo  ║                                                    ║
echo  ║   1. Look at the "YOURTWIN Backend Tunnel" window  ║
echo  ║                                                    ║
echo  ║   2. Find the URL that looks like:                 ║
echo  ║      https://xxx-xxx-xxx.trycloudflare.com         ║
echo  ║                                                    ║
echo  ║   3. Copy that URL (you'll need it next)           ║
echo  ║                                                    ║
echo  ╚════════════════════════════════════════════════════╝
echo.

:: ============================================
:: STEP 4: Update Frontend Environment
:: ============================================
echo [4/5] Configure Frontend with Backend URL
echo.
set /p BACKEND_URL="Paste the backend tunnel URL here: "

if "%BACKEND_URL%"=="" (
    echo.
    echo [ERROR] No URL provided!
    echo Please copy the URL from the Backend Tunnel window.
    echo.
    pause
    exit /b 1
)

:: Remove trailing slash if present
if "%BACKEND_URL:~-1%"=="/" set BACKEND_URL=%BACKEND_URL:~0,-1%

:: Validate URL format
echo %BACKEND_URL% | findstr /i "trycloudflare.com" >nul
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] URL doesn't look like a Cloudflare tunnel URL.
    echo Expected format: https://xxx.trycloudflare.com
    echo.
    set /p continue_anyway="Continue anyway? (yes/no): "
    if /i not "!continue_anyway!"=="yes" (
        pause
        exit /b 1
    )
)

:: Update frontend .env file
set "FRONTEND_ENV=%~dp0yourtwin-frontend\.env"

echo.
echo Updating frontend environment...

if exist "%FRONTEND_ENV%" (
    :: Check if VITE_API_URL exists in .env
    findstr /i "VITE_API_URL" "%FRONTEND_ENV%" >nul 2>&1
    if !errorlevel! equ 0 (
        :: Create temp file with updated URL
        set "TEMP_ENV=%TEMP%\frontend_env_temp.txt"
        (
            for /f "usebackq delims=" %%a in ("%FRONTEND_ENV%") do (
                set "line=%%a"
                echo !line! | findstr /i "^VITE_API_URL" >nul
                if !errorlevel! equ 0 (
                    echo VITE_API_URL=%BACKEND_URL%/api
                ) else (
                    echo !line!
                )
            )
        ) > "!TEMP_ENV!"
        move /y "!TEMP_ENV!" "%FRONTEND_ENV%" >nul
    ) else (
        :: Add VITE_API_URL to end of file
        echo VITE_API_URL=%BACKEND_URL%/api>> "%FRONTEND_ENV%"
    )
) else (
    :: Create new .env file
    echo VITE_API_URL=%BACKEND_URL%/api> "%FRONTEND_ENV%"
)

echo       [OK] Frontend .env updated with: VITE_API_URL=%BACKEND_URL%/api

:: Restart frontend to pick up new environment
echo.
echo Restarting Frontend to apply new environment...

:: Kill existing frontend
taskkill /FI "WINDOWTITLE eq YOURTWIN Frontend*" /F >nul 2>&1
timeout /t 2 >nul

:: Restart frontend
start "YOURTWIN Frontend" cmd /k "cd /d %~dp0yourtwin-frontend && echo Restarting with tunnel URL... && npm run dev"

echo       [OK] Frontend restarted
echo.
echo Waiting for frontend to initialize...
timeout /t 6 >nul

:: ============================================
:: STEP 5: Start Frontend Tunnel
:: ============================================
echo.
echo [5/5] Starting Frontend Tunnel...
echo.
echo       Creating tunnel to http://localhost:3000
echo.

start "YOURTWIN Frontend Tunnel" cmd /k "echo Connecting to Cloudflare... && cloudflared tunnel --url http://localhost:3000"

timeout /t 5 >nul

:: ============================================
:: Success!
:: ============================================
echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║         CLOUDFLARE TUNNELS ESTABLISHED!            ║
echo  ╠════════════════════════════════════════════════════╣
echo  ║                                                    ║
echo  ║   Backend Tunnel:                                  ║
echo  ║     %BACKEND_URL%
echo  ║                                                    ║
echo  ║   Frontend Tunnel:                                 ║
echo  ║     Check "YOURTWIN Frontend Tunnel" window        ║
echo  ║     for the public URL to share!                   ║
echo  ║                                                    ║
echo  ╠════════════════════════════════════════════════════╣
echo  ║                                                    ║
echo  ║   Share the Frontend URL with anyone to give them  ║
echo  ║   access to your YOURTWIN: CODE application!       ║
echo  ║                                                    ║
echo  ╠════════════════════════════════════════════════════╣
echo  ║   Windows to keep open:                            ║
echo  ║     - YOURTWIN Backend (server)                    ║
echo  ║     - YOURTWIN Frontend (server)                   ║
echo  ║     - YOURTWIN Backend Tunnel                      ║
echo  ║     - YOURTWIN Frontend Tunnel                     ║
echo  ║                                                    ║
echo  ║   Closing any of these will break the connection!  ║
echo  ╚════════════════════════════════════════════════════╝
echo.
echo Press any key to close this setup window...
pause >nul
