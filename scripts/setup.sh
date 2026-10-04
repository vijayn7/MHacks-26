#!/usr/bin/env bash
# First-time local setup. Run from the repo root, not from ~.
set -euo pipefail

if [[ ! -f package.json || ! -f .env.example || ! -d apps/web ]]; then
  echo "You are in $(pwd)."
  echo "This is not the Impulse repo. Clone it first, then run this script from that folder:"
  echo
  echo "  git clone https://github.com/vijayn7/MHacks-26.git"
  echo "  cd MHacks-26"
  echo "  git checkout cursor/impulse-spending-app-70f2"
  echo "  bash scripts/setup.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node is not installed. This API needs Node 22 (built-in SQLite)."
  echo "On a Mac with Homebrew:"
  echo "  brew install node@22"
  echo "  echo 'export PATH=\"/opt/homebrew/opt/node@22/bin:\$PATH\"' >> ~/.zprofile"
  echo "  source ~/.zprofile"
  echo "Or:  nvm install 22 && nvm use 22"
  exit 1
fi

major=$(node -p "process.versions.node.split('.')[0]")
if (( major < 22 )); then
  echo "Node $(node -v) is too old. Need 22 or newer for --experimental-sqlite."
  echo "  brew install node@22   or   nvm install 22"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "Enabling pnpm through Corepack…"
    corepack enable
    corepack prepare pnpm@10.8.1 --activate
  else
    echo "pnpm is missing and Corepack is not available."
    echo "  npm install -g pnpm"
    exit 1
  fi
fi

echo "Node $(node -v)  pnpm $(pnpm -v)"
pnpm install
mkdir -p apps/web
if [[ ! -f apps/web/.env.local ]]; then
  cp .env.example apps/web/.env.local
  echo "Wrote apps/web/.env.local from .env.example"
else
  echo "apps/web/.env.local already exists — left it alone"
fi

echo
echo "Ready. In this same folder, in three terminals if you want everything:"
echo "  pnpm dev:web                 # http://localhost:3000"
echo "  bash scripts/demo.sh         # after the server is up"
echo "  cd apps/mobile && pnpm exec expo start"
echo "  pnpm build:extension         # then load apps/extension/.output/chrome-mv3 in Chrome"
