#!/usr/bin/env bash
# Installs earshot (MIT, github.com/Leonxlnx/earshot) so an agent can "hear"
# Footera's sounds: CLAP + AudioSet models on CPU, ~1.4 GB tool + ~1.1 GB
# models, about 10 min in a fresh cloud container. Safe to run again: it
# skips what is already there. Never part of CI.
#
# Needs network access to download.pytorch.org, download-r2.pytorch.org and
# huggingface.co (+ its CDN hosts). These are allowed in Basti's cloud
# environment since 2026-11-18.
set -euo pipefail
EARSHOT_REF="${EARSHOT_REF:-4ac3d2ac2b151e1c23376f9ce7f3047a17050013}"   # v0.4.1, pinned
if ! command -v uv >/dev/null; then echo "earshot-setup: uv is missing (https://docs.astral.sh/uv/)" >&2; exit 1; fi
if ! command -v ffmpeg >/dev/null; then echo "earshot-setup: ffmpeg is missing" >&2; exit 1; fi
export PATH="$HOME/.local/bin:$PATH"
if ! command -v earshot >/dev/null; then
  uv tool install --quiet "earshot[mcp] @ git+https://github.com/Leonxlnx/earshot@${EARSHOT_REF}"
fi
if earshot doctor 2>/dev/null | grep -q '^models_cached: .*false'; then
  earshot doctor --fetch | grep -E '^(fetched|problems):' || true
fi
if earshot doctor 2>/dev/null | grep -q '^models_cached: .*false'; then
  echo "earshot-setup: models still missing (network blocked? see AGENTS.md, Sound hören)" >&2; exit 1
fi
echo "earshot ready: $(command -v earshot)"
