#!/bin/bash

echo "🎮 Pictionary LAN Server"
echo "========================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install-all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🔨 Building client..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build client"
    exit 1
fi

echo "🚀 Starting LAN server..."
echo ""
echo "🌐 Server will be available at:"
echo "   - Host: http://localhost:5000"
echo "   - Other players: http://[YOUR_IP]:5000"
echo ""
echo "📱 To find your IP address:"
echo "   - Linux/Mac: ifconfig or ip addr"
echo "   - Windows: ipconfig"
echo ""

npm start 