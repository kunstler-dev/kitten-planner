#!/bin/bash
# Installs project deps (incl. Electron binary) so lint/tests/e2e work in cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# Playwright is only used to drive Electron; the system Chromium is preinstalled.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install --no-audit --no-fund
