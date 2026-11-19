#!/usr/bin/env bash
# V21.480 (Basti 19.11.2026): Playwright MCP (Apache-2.0, https://github.com/microsoft/playwright-mcp)
# lets Claude click through Footera itself like a player on a phone-sized screen.
# Started by .mcp.json. In the cloud it uses the preinstalled Chromium; elsewhere
# Playwright's own browser. Serve the game first, e.g. `python3 -m http.server 8123`,
# then open http://localhost:8123/index.html.
set -euo pipefail
args=(--headless --isolated --device "iPhone 13" --output-dir test-artifacts/playwright-mcp)
for chrome in /opt/pw-browsers/chromium /opt/pw-browsers/chromium-*/chrome-linux64/chrome; do
  if [ -x "$chrome" ]; then args+=(--executable-path "$chrome" --no-sandbox); break; fi
done
exec npx -y @playwright/mcp@0.0.84 "${args[@]}" "$@"
