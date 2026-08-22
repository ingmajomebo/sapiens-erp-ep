#!/usr/bin/env bash
# Construye las tres imágenes y las sube al registro, etiquetadas con el
# commit exacto. Ejecutar desde tu máquina o desde CI, nunca en el VPS:
# el servidor solo descarga imágenes ya construidas.
#
#   ./deploy/build-push.sh
#
# Requiere haber hecho login antes:
#   echo $GHCR_TOKEN | docker login ghcr.io -u <usuario> --password-stdin
set -euo pipefail

cd "$(dirname "$0")/.."

REGISTRY="${REGISTRY:-ghcr.io/ingmajomebo}"

# El árbol debe estar limpio: una imagen etiquetada con un commit tiene que
# contener exactamente ese commit, o la etiqueta miente.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "!! Hay cambios sin commitear. Commitea antes de construir." >&2
    git status --short >&2
    exit 1
fi

# Comprobar la sesión antes de gastar varios minutos construyendo
if ! grep -q "ghcr.io" ~/.docker/config.json 2>/dev/null; then
    echo "!! Sin sesión en ghcr.io. Ejecuta primero:" >&2
    echo "     docker login ghcr.io -u ingmajomebo" >&2
    echo "   con un token que tenga write:packages." >&2
    exit 1
fi

TAG="$(git rev-parse --short HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "==> Construyendo $TAG (rama $BRANCH)"

build_and_push() {
    local name="$1" context="$2"
    echo "--> $name"
    docker build --platform linux/amd64 -t "$REGISTRY/$name:$TAG" "$context"
    docker push "$REGISTRY/$name:$TAG"
}

build_and_push erp-backend  ./backend
build_and_push erp-frontend ./frontend
build_and_push storefront   ./storefront

echo
echo "==> Listo. Etiqueta: $TAG"
echo
echo "   Desplegar en desarrollo:"
echo "     ssh <vps> 'cd /opt/encanto && ./deploy/release.sh dev $TAG'"
