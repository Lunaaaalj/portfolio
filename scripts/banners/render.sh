#!/bin/sh
# Builds the banner SVGs, then renders PNGs with headless Chrome:
#   LinkedIn at 2x (3168 × 792), the GitHub social preview at 1x (1280 × 640).
# The GitHub header stays an SVG (the profile README embeds it through <picture>).
#   sh scripts/banners/render.sh       (set CHROME to the browser binary if it is elsewhere)
set -e
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
node scripts/banners/build.mjs
shot() { # name width height scale
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$4" \
    --window-size="$2,$3" --screenshot="$PWD/banner/out/terminal/$1.png" "file://$PWD/banner/out/terminal/$1.svg" 2>/dev/null
  echo "wrote banner/out/terminal/$1.png"
}
for t in dark light; do
  shot "linkedin-$t" 1584 396 2
  shot "linkedin-$t-noname" 1584 396 2
  shot "github-social-$t" 1280 640 1
done
