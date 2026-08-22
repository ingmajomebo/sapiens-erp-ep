#!/usr/bin/env bash
# Publica los sitios de Encanto en el Caddy que ya sirve el VPS, SIN cortar
# nada. Se ejecuta en el servidor.
#
#   ./deploy/edge/apply-sites.sh
#
# Cómo funciona y por qué es seguro:
#
#   1. El Caddy de agenda solo tiene montado un archivo, así que no se puede
#      importar el nuestro desde fuera. La configuración final se genera
#      concatenando la base de agenda con nuestros sitios.
#   2. La candidata se valida DENTRO del contenedor antes de tocar el archivo
#      en producción. Si no valida, no se cambia nada.
#   3. `caddy reload` intercambia la configuración en caliente: no cierra
#      conexiones ni reinicia el proceso. agenda no se entera.
#
# La primera vez guarda la configuración actual de agenda como base. A partir
# de ahí, esa base es la fuente de verdad de agenda y este directorio la de
# Encanto: ninguno pisa al otro.
set -euo pipefail

CADDY_CONTAINER="${CADDY_CONTAINER:-agenda-caddy-1}"
LIVE="${LIVE_CADDYFILE:-/opt/agenda/Caddyfile}"
BASE="${LIVE}.base"
SITES_DIR="$(cd "$(dirname "$0")" && pwd)/sites"

command -v docker >/dev/null || { echo "!! docker no está disponible" >&2; exit 1; }
docker inspect "$CADDY_CONTAINER" >/dev/null 2>&1 || {
    echo "!! No existe el contenedor $CADDY_CONTAINER" >&2; exit 1; }

# ── 1. Base de agenda, guardada una sola vez ─────────────────────────────────
if [[ ! -f "$BASE" ]]; then
    echo "==> Primera ejecución: guardando la configuración de agenda como base"
    cp "$LIVE" "$BASE"
    echo "    $BASE"
fi

# ── 2. La red compartida y el proxy dentro de ella ───────────────────────────
docker network inspect edge >/dev/null 2>&1 || {
    echo "==> Creando la red edge"
    docker network create edge >/dev/null
}
if ! docker inspect "$CADDY_CONTAINER" \
        --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw edge; then
    echo "==> Conectando $CADDY_CONTAINER a la red edge (sin reiniciarlo)"
    docker network connect edge "$CADDY_CONTAINER"
fi

# ── 3. Generar la candidata ──────────────────────────────────────────────────
CANDIDATE="$(mktemp)"
trap 'rm -f "$CANDIDATE"' EXIT

cat "$BASE" > "$CANDIDATE"
printf '\n\n# ─── Generado por deploy/edge/apply-sites.sh — no editar a mano ───\n' >> "$CANDIDATE"
shopt -s nullglob
for site in "$SITES_DIR"/*.caddy; do
    printf '\n# fuente: %s\n' "$(basename "$site")" >> "$CANDIDATE"
    cat "$site" >> "$CANDIDATE"
done
shopt -u nullglob

# ── 4. Validar DENTRO del contenedor, antes de tocar producción ──────────────
echo "==> Validando la configuración candidata"
docker cp "$CANDIDATE" "$CADDY_CONTAINER:/tmp/Caddyfile.candidate" >/dev/null
if ! docker exec "$CADDY_CONTAINER" caddy validate --config /tmp/Caddyfile.candidate 2>&1 \
        | tee /tmp/caddy-validate.log | grep -q "Valid configuration"; then
    echo "!! La configuración no valida. No se cambió nada." >&2
    grep -iE "error" /tmp/caddy-validate.log >&2 || true
    docker exec "$CADDY_CONTAINER" rm -f /tmp/Caddyfile.candidate 2>/dev/null || true
    exit 1
fi
docker exec "$CADDY_CONTAINER" rm -f /tmp/Caddyfile.candidate 2>/dev/null || true

# ── 5. Aplicar en caliente ───────────────────────────────────────────────────
cp "$LIVE" "${LIVE}.prev"          # una vuelta atrás inmediata
cp "$CANDIDATE" "$LIVE"

echo "==> Recargando Caddy en caliente"
if docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile; then
    echo "==> Listo. Sitios activos:"
    grep -hE "^[a-z0-9.,[:space:]-]+\{$" "$LIVE" | sed 's/ {$//' | sed 's/^/     /'
else
    echo "!! La recarga falló. Restaurando la configuración anterior." >&2
    cp "${LIVE}.prev" "$LIVE"
    docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile || true
    exit 1
fi
