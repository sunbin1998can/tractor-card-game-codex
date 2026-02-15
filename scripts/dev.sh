#!/usr/bin/env bash
# scripts/dev.sh
#
# Start Tractor card game local development environment:
# - WebSocket server (default port 3000)
# - Vite web client  (default port 5173)
#
# Ports auto-increment if already in use.

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DEFAULT_SERVER_PORT=3000
DEFAULT_WEB_PORT=5173

SERVER_PID=""
WEB_PID=""

is_port_in_use() {
  local port=$1
  if command -v ss &> /dev/null; then
    ss -tuln | grep -qE ":${port}\s" || ss -tuln | grep -qE ":${port}$"
    return $?
  elif command -v lsof &> /dev/null; then
    lsof -i :"$port" &> /dev/null
    return $?
  else
    return 1
  fi
}

find_available_port() {
  local start_port=$1
  local max_attempts=${2:-10}
  local port=$start_port

  for ((i=0; i<max_attempts; i++)); do
    if ! is_port_in_use "$port"; then
      echo "$port"
      return 0
    fi
    ((port++))
  done

  echo ""
  return 1
}

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
    pkill -P "$WEB_PID" 2>/dev/null || true
  fi
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    pkill -P "$SERVER_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

echo -e "${BLUE}==> Installing dependencies...${NC}"
(cd "$REPO_ROOT" && pnpm install --silent)
echo ""

# Find available ports
SERVER_PORT=$(find_available_port $DEFAULT_SERVER_PORT)
if [ -z "$SERVER_PORT" ]; then
  echo -e "${YELLOW}Error: Could not find available server port (tried $DEFAULT_SERVER_PORT-$((DEFAULT_SERVER_PORT+9)))${NC}"
  exit 1
fi
if [ "$SERVER_PORT" != "$DEFAULT_SERVER_PORT" ]; then
  echo -e "  ${YELLOW}Port $DEFAULT_SERVER_PORT in use, server using $SERVER_PORT${NC}"
fi

WEB_PORT=$(find_available_port $DEFAULT_WEB_PORT)
if [ -z "$WEB_PORT" ]; then
  echo -e "${YELLOW}Error: Could not find available web port (tried $DEFAULT_WEB_PORT-$((DEFAULT_WEB_PORT+9)))${NC}"
  exit 1
fi
if [ "$WEB_PORT" != "$DEFAULT_WEB_PORT" ]; then
  echo -e "  ${YELLOW}Port $DEFAULT_WEB_PORT in use, web using $WEB_PORT${NC}"
fi

echo -e "${BLUE}==> Starting server on port $SERVER_PORT...${NC}"
(cd "$REPO_ROOT" && PORT=$SERVER_PORT pnpm --filter @tractor/server dev) &
SERVER_PID=$!

echo -e "${BLUE}==> Starting web client on port $WEB_PORT...${NC}"
(cd "$REPO_ROOT" && VITE_WS_URL="ws://localhost:${SERVER_PORT}/ws" pnpm --filter @tractor/web exec vite --port "$WEB_PORT" --strictPort) &
WEB_PID=$!

echo ""
echo -e "${GREEN}=== Development Environment Ready ===${NC}"
echo ""
echo -e "  ${CYAN}Web client:${NC}  http://localhost:$WEB_PORT"
echo -e "  ${CYAN}WS server:${NC}   ws://localhost:$SERVER_PORT/ws"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

wait
