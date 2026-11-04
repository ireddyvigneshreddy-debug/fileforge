#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "⚡ Starting FileForge Pro Offline..."

# Check if server is already running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
  echo "FileForge is already running on http://localhost:3000"
else
  # Start production server in background
  ./node_modules/.bin/next start -p 3000 &
  PID=$!
  sleep 2
fi

# Open in default browser or installed app
open "http://localhost:3000"

echo "✅ FileForge is active at http://localhost:3000"
echo "You can close this terminal window whenever you're done."
