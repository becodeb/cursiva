#!/usr/bin/env bash
# Headless screenshot helper.
#
# usage: scripts/shot.sh <url> <out.png> [viewport_width] [viewport_height]
#
# WHERE THE FILE LANDS. A bare name ("mapa.png") or a relative path goes to
# `capturas/` at the repo root, never to the shell's current directory and
# never to /tmp. Captures are review material — docs/12 §4 makes reading them
# part of the work — and a capture the reviewer cannot find has done nothing.
# An absolute path is still honoured verbatim, so a caller that really wants
# somewhere else just says so. `capturas/` is gitignored: the images are
# regenerable from the dev server and do not belong in the history.
#
# Three traps on this host, all found the hard way:
#   1. --disable-gpu is mandatory or chromium hangs.
#   2. --window-size is the WINDOW, not the viewport: the viewport comes out
#      CHROME_OFFSET px shorter, and the screenshot keeps the full window
#      height, so the extra pixels are painted white below the page. That white
#      band looks exactly like a layout bug and is not one. We add the offset
#      back so the caller gets the viewport size they asked for.
#   3. The window width is clamped to a 500px minimum. Asking for a 390px-wide
#      phone renders at 500 and the image is NOT what a 390px device sees.
#      Narrower than 500 is not measurable this way — use an iframe harness.
set -euo pipefail
CHROME_OFFSET=87
URL="$1"; OUT="$2"; W="${3:-1280}"; H="${4:-900}"
# Resolved from THIS script's own location, so the destination does not depend
# on where the caller happened to be standing.
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SHOTS="$ROOT/capturas"
case "$OUT" in
  /*) ;;                                  # absolute: the caller means it
  *) mkdir -p "$SHOTS/$(dirname "$OUT")"; OUT="$SHOTS/$OUT" ;;
esac
if [ "$W" -lt 500 ]; then
  echo "warn: width $W is below chromium's 500px window floor; it will render at 500" >&2
fi
TMP=$(mktemp -d)
chromium --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir="$TMP" \
  --window-size="${W},$((H + CHROME_OFFSET))" \
  --virtual-time-budget=6000 \
  --screenshot="$OUT" "$URL" >/dev/null 2>&1
rm -rf "$TMP"
echo "$OUT"
