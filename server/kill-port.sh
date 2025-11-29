#!/bin/bash
# Helper script to kill processes on port 5000

PORT=${1:-5000}

echo "🔍 Checking for processes on port $PORT..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ Port $PORT is free!"
  exit 0
fi

echo "⚠️  Found process $PID using port $PORT"
echo "🛑 Killing process $PID..."

kill -9 $PID 2>/dev/null

sleep 1

# Check if it's still running
if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "❌ Failed to kill process. Trying harder..."
  lsof -ti:$PORT | xargs kill -9 2>/dev/null
  sleep 1
fi

if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "❌ Port $PORT is still in use. You may need to manually stop the process."
  exit 1
else
  echo "✅ Port $PORT is now free!"
  exit 0
fi

