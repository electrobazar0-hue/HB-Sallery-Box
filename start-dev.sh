#!/bin/bash

# Kill any existing dev server
pkill -f "next dev"
sleep 2

# Clean .next cache
rm -rf .next

# Start dev server
cd /home/z/my-project
NODE_OPTIONS='--max-old-space-size=4096' bun run dev &
DEV_PID=$!

echo "Dev server started with PID: $DEV_PID"

# Wait and check if it's running
sleep 10
if ps -p $DEV_PID > /dev/null; then
  echo "Server is running successfully"
  echo "Waiting for compilation..."
  sleep 15
  echo "Server should be ready at http://localhost:3000"
else
  echo "Server failed to start"
  exit 1
fi
