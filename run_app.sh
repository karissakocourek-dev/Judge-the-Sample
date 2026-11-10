#!/usr/bin/env bash
# Start the Judge the Sample app locally (browser-only React + Vite).
# Usage, from this project folder in a Bash terminal (Git Bash on Windows):
#     bash run_app.sh
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "node_modules/ not found: installing dependencies (npm install)..."
  npm install
fi

echo ""
echo "Starting the app. Open this address in your browser:"
echo "    http://localhost:5173/"
echo "(If that port is busy, Vite prints a different 'Local:' address below: use that one.)"
echo "Stop the app with Ctrl+C in this terminal."
echo ""
npm run dev
