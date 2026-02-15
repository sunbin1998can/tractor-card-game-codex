#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Installing server dependencies..."
(cd "$REPO_ROOT/server" && pnpm install)

echo "==> Installing web dependencies..."
(cd "$REPO_ROOT/web" && pnpm install)

cleanup() {
  echo ""
  echo "==> Shutting down..."
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
  fi
}
trap cleanup EXIT INT TERM

echo "==> Starting server..."
(cd "$REPO_ROOT/server" && pnpm dev) &
SERVER_PID=$!

echo "==> Starting web client..."
cd "$REPO_ROOT/web" && pnpm dev
