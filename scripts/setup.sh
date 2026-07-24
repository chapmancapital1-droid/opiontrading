#!/usr/bin/env bash
# OptionScope local install (macOS / Linux)
# From repo root after clone:
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
# Or simply:
#   npm run setup

set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/setup.mjs
