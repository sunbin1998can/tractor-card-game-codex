#!/usr/bin/env bash
# scripts/build.sh
#
# Build the Docker image for the Tractor card game.
#
# Usage:
#   bash scripts/build.sh            # build with default tag
#   bash scripts/build.sh --tag v1.0 # build with custom tag

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

IMAGE_NAME="tractor-card-game"
TAG="latest"

for arg in "$@"; do
  case "$arg" in
    --tag=*) TAG="${arg#--tag=}" ;;
    --tag)   shift_next=true ;;
    *)
      if [ "${shift_next:-}" = true ]; then
        TAG="$arg"
        shift_next=false
      fi
      ;;
  esac
done

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker not found. Please install Docker first.${NC}"
  exit 1
fi

echo -e "${BLUE}==> Building Docker image ${BOLD}${IMAGE_NAME}:${TAG}${NC}"
docker build -t "${IMAGE_NAME}:${TAG}" "$REPO_ROOT"

echo ""
echo -e "${GREEN}${BOLD}==> Build complete: ${IMAGE_NAME}:${TAG}${NC}"
echo ""
echo -e "  Run with:"
echo -e "    docker run -p 3000:3000 ${IMAGE_NAME}:${TAG}"
