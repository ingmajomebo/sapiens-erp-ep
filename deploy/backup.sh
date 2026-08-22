#!/usr/bin/env bash
# Respaldo de base de datos y archivos subidos.
#
#   ./deploy/backup.sh            # respalda producción
#   ./deploy/backup.sh dev        # respalda desarrollo
#
# En cron:
#   0 3 * * * /opt/encanto/deploy/backup.sh >> /var/log/encanto-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT="${1:-prod}"
ENV_FILE="deploy/env/${ENVIRONMENT}.env"
[[ -f "$ENV_FILE" ]] || { echo "!! No existe $ENV_FILE" >&2; exit 1; }

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/encanto/$ENVIRONMENT}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.stack.yml"

mkdir -p "$BACKUP_DIR"
echo "[$(date -Is)] Respaldo $ENVIRONMENT $STAMP"

# ── Base de datos ──
$COMPOSE exec -T postgres \
    pg_dump -U "$PGUSER" -d "$PGDATABASE" --format=custom \
    > "$BACKUP_DIR/db-$STAMP.dump"

# ── Archivos subidos (imágenes de producto y evidencia QA) ──
# El volumen lleva el prefijo del proyecto que fija STACK_NAME
docker run --rm \
    -v "${STACK_NAME}_uploads:/data:ro" \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .

# ── Retención ──
find "$BACKUP_DIR" -name 'db-*.dump'        -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[$(date -Is)] Listo · $(du -sh "$BACKUP_DIR" | cut -f1) en total"
