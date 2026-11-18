#!/usr/bin/env bash
# Listen to Footera's game sounds with earshot.
#   scripts/sound/hear.sh                 render all cues and listen
#   scripts/sound/hear.sh kick-shot net   only these cues
#   scripts/sound/hear.sh --dir some/folder   listen to existing audio files
# Output: test-artifacts/sound/earshot-report.md (+ .json, the WAVs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/test-artifacts/sound"
DIR=""
if [ "${1:-}" = "--dir" ]; then DIR="$2"; shift 2; fi
bash "$ROOT/scripts/sound/earshot-setup.sh"
export PATH="$HOME/.local/bin:$PATH"
PY="$(uv tool dir)/earshot/bin/python"
if [ -z "$DIR" ]; then
  ONLY=""; [ $# -gt 0 ] && ONLY="--only $(IFS=,; echo "$*")"
  node "$ROOT/scripts/sound/render-game-sounds.cjs" --out "$OUT" $ONLY
  DIR="$OUT"
fi
"$PY" -I "$ROOT/scripts/sound/earshot-listen.py" "$DIR" "$@"
