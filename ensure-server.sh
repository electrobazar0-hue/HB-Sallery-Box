#!/bin/bash
# Check if Next.js server is running on port 3000
if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  cd /home/z/my-project
  NODE_OPTIONS='--max-old-space-size=2048' nohup npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
  disown
  echo "$(date): Restarted server" >> /home/z/my-project/dev.log
fi