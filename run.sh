#!/bin/sh
# TuneForge launcher — serves the app locally and opens the browser (macOS).
cd "$(dirname "$0")" || exit 1
PORT="${1:-8765}"
URL="http://localhost:$PORT"
echo "TuneForge → $URL   (Ctrl-C to stop)"
if command -v open >/dev/null 2>&1; then
  (sleep 1; open "$URL") &
fi
exec python3 -m http.server "$PORT"
