@echo off
echo 🎮 Pictionary LAN Server
echo ========================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm run install-all

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🔨 Building client...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Failed to build client
    pause
    exit /b 1
)

echo 🚀 Starting LAN server...
echo.
echo 🌐 Server will be available at:
echo    - Host: http://localhost:5000
echo    - Other players: http://[YOUR_IP]:5000
echo.
echo 📱 To find your IP address:
echo    - Run: ipconfig
echo.

call npm start
pause 