#!/usr/bin/env bash
# Despliegue / actualización del stack. Ejecutar dentro de APP_DIR en el VPS.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Trayendo cambios"
git pull --ff-only

echo "==> Reconstruyendo imágenes"
docker compose -f docker-compose.prod.yml build

echo "==> Levantando servicios"
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "==> Esperando health del backend"
for _ in $(seq 1 40); do
    if docker compose -f docker-compose.prod.yml ps backend | grep -q "healthy"; then
        echo "==> Backend saludable"
        docker image prune -f > /dev/null
        echo "==> Despliegue OK"
        exit 0
    fi
    sleep 5
done

echo "!! El backend no llegó a healthy. Revisa los logs:" >&2
docker compose -f docker-compose.prod.yml logs --tail=80 backend >&2
exit 1
