#!/usr/bin/env bash
# dev.sh — Starts all Sapiens ERP services: PostgreSQL → Backend → Frontend
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_LOG=/tmp/sapiens-backend.log
FRONTEND_LOG=/tmp/sapiens-frontend.log

# ── Colors ──────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { printf "${B}►${NC}  %s\n" "$*"; }
ok()   { printf "${G}✓${NC}  %s\n" "$*"; }
err()  { printf "${R}✗${NC}  %s\n" "$*" >&2; }
warn() { printf "${Y}⚠${NC}  %s\n" "$*"; }

# ── Cleanup on exit / Ctrl+C ────────────────────────────────
PIDS=()
cleanup() {
  printf "\n"
  log "Stopping services…"
  for pid in "${PIDS[@]-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait "${PIDS[@]-}" 2>/dev/null || true
  ok "All stopped. Goodbye."
}
trap cleanup EXIT INT TERM

# ── Pre-flight checks ───────────────────────────────────────
printf "\n${BOLD}Sapiens ERP — dev startup${NC}\n\n"

command -v docker >/dev/null 2>&1 || { err "Docker not found. Install Docker Desktop: https://www.docker.com"; exit 1; }
command -v java   >/dev/null 2>&1 || { err "Java not found. Install Java 21+: https://adoptium.net"; exit 1; }
command -v npm    >/dev/null 2>&1 || { err "Node.js/npm not found. Install: https://nodejs.org"; exit 1; }

# Prefer docker compose v2, fall back to docker-compose v1
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  err "docker compose not found. Update Docker Desktop."
  exit 1
fi

# ── 1. PostgreSQL ───────────────────────────────────────────
log "Starting PostgreSQL (Docker)…"
$COMPOSE -f "$ROOT/docker-compose.yml" up -d 2>&1 | grep -E "Started|Running|Healthy|created|done" || true

log "Waiting for PostgreSQL to be ready…"
for i in $(seq 1 30); do
  if $COMPOSE -f "$ROOT/docker-compose.yml" exec -T postgres \
       pg_isready -U sapiens -d sapiens_erp &>/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "PostgreSQL did not start in time."
    exit 1
  fi
  sleep 1
done
ok "PostgreSQL  localhost:5432 / sapiens_erp"

# ── 2. Backend (Spring Boot) ────────────────────────────────
# Load backend/.env if it exists (never committed — see .gitignore)
if [ -f "$ROOT/backend/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/backend/.env"
  set +a
  ok "Loaded env   backend/.env"
fi

log "Starting backend…  (logs → $BACKEND_LOG)"
(cd "$ROOT/backend" && exec ./gradlew bootRun 2>&1) >"$BACKEND_LOG" 2>&1 &
PIDS+=($!)
BACKEND_PID="${PIDS[0]}"

log "Waiting for backend on :8080…  (this takes ~15 s on first run)"
for i in $(seq 1 60); do
  if (echo >/dev/tcp/localhost/8080) 2>/dev/null; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend crashed on startup. Last output:"
    tail -40 "$BACKEND_LOG" >&2
    exit 1
  fi
  sleep 2
done
ok "Backend     http://localhost:8080"

# ── 3. Frontend (Vite) ──────────────────────────────────────
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  log "Installing frontend dependencies…"
  (cd "$ROOT/frontend" && npm install)
fi

log "Starting frontend…  (logs → $FRONTEND_LOG)"
(cd "$ROOT/frontend" && exec npm run dev 2>&1) >"$FRONTEND_LOG" 2>&1 &
PIDS+=($!)

# Give Vite a moment to bind the port
sleep 3
ok "Frontend    http://localhost:5173"

# ── Ready banner ────────────────────────────────────────────
printf "\n"
printf "  ┌──────────────────────────────────────────────────┐\n"
printf "  │                                                  │\n"
printf "  │  ${G}${BOLD}Sapiens ERP is running!${NC}                       │\n"
printf "  │                                                  │\n"
printf "  │  ${BOLD}App${NC}        http://localhost:5173               │\n"
printf "  │  ${BOLD}API${NC}        http://localhost:8080/api/v1         │\n"
printf "  │  ${BOLD}Database${NC}   localhost:5432  (sapiens_erp)        │\n"
printf "  │                                                  │\n"
printf "  │  ${Y}Credentials:${NC}  admin@sapiens.com / Admin1234!     │\n"
printf "  │                                                  │\n"
printf "  │  Press  ${BOLD}Ctrl+C${NC}  to stop everything               │\n"
printf "  │                                                  │\n"
printf "  └──────────────────────────────────────────────────┘\n"
printf "\n"

# ── Stream logs ─────────────────────────────────────────────
# Show prefixed lines from both log files
tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
