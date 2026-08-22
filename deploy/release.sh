#!/usr/bin/env bash
# Despliega una etiqueta concreta en un ambiente. Se ejecuta EN EL VPS.
#
#   ./deploy/release.sh dev  a3f9c21     # publicar en desarrollo
#   ./deploy/release.sh prod a3f9c21     # publicar en producción
#
# No construye nada: solo descarga la imagen ya construida y la levanta.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT="${1:-}"
TAG="${2:-}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo "Uso: ./deploy/release.sh <dev|prod> <etiqueta>" >&2
    exit 1
fi
if [[ -z "$TAG" ]]; then
    echo "!! Falta la etiqueta de imagen" >&2
    exit 1
fi

ENV_FILE="deploy/env/${ENVIRONMENT}.env"
[[ -f "$ENV_FILE" ]] || { echo "!! No existe $ENV_FILE" >&2; exit 1; }

COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.stack.yml"

# Confirmación explícita para producción: es la única barrera antes de que
# los clientes vean el cambio.
if [[ "$ENVIRONMENT" == "prod" ]]; then
    CURRENT="$(grep '^IMAGE_TAG=' "$ENV_FILE" | cut -d= -f2)"
    echo "Producción: ${CURRENT:-ninguna} -> $TAG"
    read -r -p "¿Confirmas? (escribe: publicar) " answer
    [[ "$answer" == "publicar" ]] || { echo "Cancelado."; exit 1; }

    # Respaldo antes de tocar producción: las migraciones no se deshacen solas
    echo "==> Respaldando la base antes de migrar"
    ./deploy/backup.sh || { echo "!! El respaldo falló. No se despliega." >&2; exit 1; }
fi

# La etiqueta anterior queda guardada para poder volver
sed -i.rollback "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" "$ENV_FILE"

echo "==> Descargando imágenes $TAG"
if ! IMAGE_TAG="$TAG" $COMPOSE pull; then
    echo >&2
    echo "!! No se pudieron descargar las imágenes." >&2
    echo "   Si el error dice 'denied' o 'unauthorized', la sesión del" >&2
    echo "   registro caducó. Renuévala con:" >&2
    echo "     docker login ghcr.io -u ingmajomebo" >&2
    echo "   usando un token con read:packages." >&2
    exit 1
fi

echo "==> Levantando $ENVIRONMENT"
IMAGE_TAG="$TAG" $COMPOSE up -d --remove-orphans

echo "==> Esperando al backend"
for _ in $(seq 1 40); do
    if $COMPOSE ps backend | grep -q healthy; then
        echo "==> $ENVIRONMENT en $TAG"
        docker image prune -f > /dev/null
        exit 0
    fi
    sleep 5
done

echo "!! El backend no llegó a healthy. Logs:" >&2
$COMPOSE logs --tail=80 backend >&2
echo >&2
echo "   Para volver atrás:  ./deploy/rollback.sh $ENVIRONMENT" >&2
exit 1
