#!/bin/bash
cd /home/z/my-project

while true; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Next.js Production Server..."
  NODE_ENV=production npx next start -p 3000 >> /home/z/my-project/server.log 2>&1
  EXIT_CODE=$?

  echo "$(date '+%Y-%m-%d %H:%M:%S') - Server exited with code: $EXIT_CODE"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Restarting in 5 seconds..."

  sleep 5
done
