#!/bin/bash

# Auto-restart server script for HB Sallery Box
cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS='--max-old-space-size=2048' npx next dev -p 3000 >> /home/z/my-project/server.log 2>&1

  echo "[$(date)] Server stopped. Waiting 5 seconds before restart..."
  sleep 5
done
