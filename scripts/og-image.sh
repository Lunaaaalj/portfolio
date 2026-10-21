#!/bin/sh
# Renders the social preview card (scripts/og-image.html) to public/og.png with headless Chrome.
#   sh scripts/og-image.sh            (set CHROME to the browser binary if it is elsewhere)
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --allow-file-access-from-files --virtual-time-budget=3000 \
  --window-size=1200,630 --screenshot="$PWD/public/og.png" "file://$PWD/scripts/og-image.html" 2>/dev/null
echo "wrote public/og.png"
