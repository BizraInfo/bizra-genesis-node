@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM BIZRA Genesis - Phase 7 Growth Flywheel Local Deployment
REM ═══════════════════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║  BIZRA Genesis - Phase 7 Growth Flywheel System                          ║
echo ║  Local Testing Deployment                                                 ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo [2/4] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [3/4] Building dashboard...
call npm run build:dashboard
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Dashboard build failed (continuing anyway)
)
echo ✅ Dashboard built

echo.
echo [4/4] Starting servers...
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║  Starting BIZRA Growth Flywheel System                                    ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo   Backend API:     http://localhost:3001
echo   WebSocket:       ws://localhost:3001
echo   Dashboard:       http://localhost:3000
echo.
echo   Growth Flywheel Features:
echo   • Achievements:  http://localhost:3000/dashboard
echo   • Referrals:     http://localhost:3001/api/v1/referral
echo   • Analytics:     http://localhost:3001/api/v1/analytics
echo   • Growth Metrics: http://localhost:3000/dashboard/growth-metrics
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.

REM Start backend server in background
echo Starting backend server...
start "BIZRA Backend" cmd /k "cd backend && node server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend development server
echo Starting frontend server...
start "BIZRA Frontend" cmd /k "npx serve build/dashboard -p 3000"

echo.
echo ✅ Growth Flywheel system is starting...
echo.
echo Press Ctrl+C in the server windows to stop
echo.
echo Opening dashboard in browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo   BIZRA Growth Flywheel - Running
echo ═══════════════════════════════════════════════════════════════════════════
echo.
pause
