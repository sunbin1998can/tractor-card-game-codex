#!/usr/bin/env bash
# scripts/dev.sh
#
# Start Tractor card game local development environment:
# - PostgreSQL via Docker (auto-created, migrated, seeded)
# - WebSocket server (default port 3000)
# - Vite web client  (default port 5173)
#
# Ports auto-increment if already in use.
#
# Options:
#   --no-db    Skip PostgreSQL setup (memory-only mode, same as before)

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Flags ──
SKIP_DB=false
for arg in "$@"; do
  case "$arg" in
    --no-db) SKIP_DB=true ;;
  esac
done

# ── Postgres config ──
PG_CONTAINER="tractor-pg"
PG_PORT=5432
PG_USER="tractor"
PG_PASS="tractor"
PG_DB="tractor"
DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"
AUTH_SECRET="dev-secret-do-not-use-in-production"

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
  # Note: PostgreSQL container is NOT stopped — data persists between runs.
  echo -e "${GREEN}All services stopped.${NC}"
  echo -e "${CYAN}PostgreSQL container '${PG_CONTAINER}' is still running. Stop with: docker stop ${PG_CONTAINER}${NC}"
}
trap cleanup EXIT INT TERM

echo -e "${BLUE}==> Installing dependencies...${NC}"
(cd "$REPO_ROOT" && pnpm install --silent)
echo ""

# ── PostgreSQL ──
if [ "$SKIP_DB" = true ]; then
  echo -e "${YELLOW}==> Skipping PostgreSQL (--no-db). Running in memory-only mode.${NC}"
  echo ""
  unset DATABASE_URL
  unset AUTH_SECRET
else
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Install Docker or use --no-db to skip PostgreSQL.${NC}"
    exit 1
  fi

  # Start or reuse container
  if docker ps --format '{{.Names}}' | grep -qw "$PG_CONTAINER"; then
    echo -e "${BLUE}==> PostgreSQL container '${PG_CONTAINER}' already running${NC}"
  elif docker ps -a --format '{{.Names}}' | grep -qw "$PG_CONTAINER"; then
    echo -e "${BLUE}==> Starting existing PostgreSQL container '${PG_CONTAINER}'...${NC}"
    docker start "$PG_CONTAINER" > /dev/null
  else
    echo -e "${BLUE}==> Creating PostgreSQL container '${PG_CONTAINER}'...${NC}"
    docker run -d \
      --name "$PG_CONTAINER" \
      -p "${PG_PORT}:5432" \
      -e POSTGRES_USER="$PG_USER" \
      -e POSTGRES_PASSWORD="$PG_PASS" \
      -e POSTGRES_DB="$PG_DB" \
      postgres:16-alpine > /dev/null
  fi

  # Wait for PostgreSQL to be ready
  echo -ne "  Waiting for PostgreSQL"
  for i in $(seq 1 30); do
    if docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" &> /dev/null; then
      echo -e " ${GREEN}ready${NC}"
      break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
      echo -e " ${RED}timeout${NC}"
      echo -e "${RED}PostgreSQL did not start in 30s. Check: docker logs ${PG_CONTAINER}${NC}"
      exit 1
    fi
  done

  # Run migrations
  echo -e "${BLUE}==> Running database migrations...${NC}"
  (cd "$REPO_ROOT" && DATABASE_URL="$DATABASE_URL" pnpm --filter @tractor/db db:migrate)
  echo ""

  # Seed sample data
  echo -e "${BLUE}==> Seeding sample data...${NC}"
  (cd "$REPO_ROOT" && DATABASE_URL="$DATABASE_URL" AUTH_SECRET="$AUTH_SECRET" pnpm --filter @tractor/server exec tsx ../../scripts/seed.ts)
  echo ""

  export DATABASE_URL
  export AUTH_SECRET
fi

# ── Find available ports ──
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

# ── Start services ──
echo -e "${BLUE}==> Starting server on port $SERVER_PORT...${NC}"
(cd "$REPO_ROOT" && PORT=$SERVER_PORT DATABASE_URL="${DATABASE_URL:-}" AUTH_SECRET="${AUTH_SECRET:-}" pnpm --filter @tractor/server dev) &
SERVER_PID=$!

echo -e "${BLUE}==> Starting web client on port $WEB_PORT...${NC}"
(cd "$REPO_ROOT" && VITE_WS_URL="ws://localhost:${SERVER_PORT}/ws" pnpm --filter @tractor/web exec vite --port "$WEB_PORT" --strictPort) &
WEB_PID=$!

echo ""
echo -e "${GREEN}${BOLD}=== Development Environment Ready ===${NC}"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}  ${GREEN}http://localhost:$WEB_PORT${NC}  (Vite – hot reload)"
echo ""
echo -e "  ${CYAN}Server:${NC}      http://localhost:$SERVER_PORT      (API + WebSocket)"
if [ "$SKIP_DB" = false ]; then
  echo -e "  ${CYAN}PostgreSQL:${NC}  $DATABASE_URL"
  echo ""
  echo -e "  ${BOLD}Sample logins:${NC}"
  echo -e "    alice@example.com  |  bob@example.com"
  echo -e "    carol@example.com  |  dave@example.com"
  echo ""
  echo -e "  ${YELLOW}Enter any email above in the lobby → Send Code →"
  echo -e "  check this console for the 6-digit code (no email service needed)${NC}"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

wait
