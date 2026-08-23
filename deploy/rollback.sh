#!/usr/bin/env bash
# Vuelve un ambiente a la etiqueta anterior.
#
#   ./deploy/rollback.sh prod
#
# OJO: revierte el código, no la base de datos. Si el despliegue aplicó una
# migración Flyway, esa migración sigue aplicada. Para revertir datos hay que
# restaurar el respaldo que release.sh dejó antes de migrar.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT="${1:-}"
[[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "prod" ]] || {
    echo "Uso: ./deploy/rollback.sh <dev|prod>" >&2; exit 1; }

ENV_FILE="deploy/env/${ENVIRONMENT}.env"
BACKUP="${ENV_FILE}.rollback"
[[ -f "$BACKUP" ]] || { echo "!! No hay etiqueta anterior guardada" >&2; exit 1; }

PREVIOUS="$(grep '^IMAGE_TAG=' "$BACKUP" | cut -d= -f2)"
CURRENT="$(grep '^IMAGE_TAG=' "$ENV_FILE" | cut -d= -f2)"

echo "Volviendo $ENVIRONMENT de $CURRENT a $PREVIOUS"
echo "Recuerda: esto NO revierte migraciones de base de datos."

# Desde el pipeline la decisión ya la tomó una persona al lanzar el workflow
if [[ "${ROLLBACK_YES:-}" != "1" ]]; then
    read -r -p "¿Confirmas? (s/N) " answer
    [[ "$answer" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 1; }
fi

cp "$BACKUP" "$ENV_FILE"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.stack.yml"
IMAGE_TAG="$PREVIOUS" $COMPOSE up -d --remove-orphans
echo "==> $ENVIRONMENT de vuelta en $PREVIOUS"
