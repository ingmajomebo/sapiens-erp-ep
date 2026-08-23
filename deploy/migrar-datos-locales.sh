#!/usr/bin/env bash
# Lleva los datos de tu máquina local al servidor: base de datos + imágenes.
#
#   ./deploy/migrar-datos-locales.sh --destino dev  --modo completo
#   ./deploy/migrar-datos-locales.sh --destino prod --modo catalogo
#
# Dos modos, porque no siempre quieres lo mismo:
#
#   completo  Clona la base entera. El ambiente queda idéntico al local,
#             INCLUIDOS tus usuarios: entrarías con admin@sapiens.com y tu
#             contraseña local. Pensado para desarrollo.
#
#   catalogo  Solo productos, categorías, proveedores, bodegas y la
#             configuración de la tienda. No toca usuarios, roles ni permisos
#             del servidor, y no arrastra ventas ni movimientos de prueba.
#             Es lo que corresponde para producción: el stock arranca en cero
#             y se carga con movimientos reales.
#
# Siempre respalda el destino antes de tocarlo. Nunca modifica lo local.
set -euo pipefail

DESTINO=""; MODO=""; ASUMIR_SI="${MIGRAR_YES:-0}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --destino) DESTINO="$2"; shift 2 ;;
        --modo)    MODO="$2";    shift 2 ;;
        --si)      ASUMIR_SI=1;  shift ;;
        *) echo "!! Opción desconocida: $1" >&2; exit 1 ;;
    esac
done
[[ "$DESTINO" =~ ^(dev|prod)$ ]] || { echo "!! --destino debe ser dev o prod" >&2; exit 1; }
[[ "$MODO" =~ ^(completo|catalogo)$ ]] || { echo "!! --modo debe ser completo o catalogo" >&2; exit 1; }

if [[ "$DESTINO" == "prod" && "$MODO" == "completo" ]]; then
    echo "!! Clonar la base local completa sobre producción reemplazaría los usuarios" >&2
    echo "   reales por los tuyos de pruebas y borraría el histórico. Usa --modo catalogo." >&2
    exit 1
fi

SSH_HOST="${SSH_HOST:-agenda-vps}"
REMOTO="${REMOTO:-/opt/encanto}"
PG_LOCAL="${PG_LOCAL:-sapiens-erp-postgres-1}"
BD_LOCAL="${BD_LOCAL:-sapiens_erp}"
USUARIO="${USUARIO:-sapiens}"
VOL_LOCAL="${VOL_LOCAL:-sapiens-erp_uploads}"

STACK="encanto-$DESTINO"
ENVFILE="deploy/env/$DESTINO.env"
BD_REMOTA="sapiens_erp_$DESTINO"
[[ "$DESTINO" == "prod" ]] && BD_REMOTA="sapiens_erp"
VOL_REMOTO="${STACK}_uploads"

# En el servidor todo pasa por compose, para no depender de nombres de contenedor.
DC="cd $REMOTO && docker compose --env-file $ENVFILE -f docker-compose.stack.yml"

# Tablas de catálogo, en orden de dependencia (padres primero).
TABLAS_CATALOGO=(
    categories subcategories warehouses suppliers financial_accounts
    products storefront_settings storefront_products ai_context_settings
)

TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

echo "==> Destino: $DESTINO ($BD_REMOTA)   ·   Modo: $MODO"

# ── 1. Las migraciones deben coincidir, o el volcado no encaja ───────────────
echo "==> Comparando la versión del esquema"
V_LOCAL=$(docker exec "$PG_LOCAL" psql -U "$USUARIO" -d "$BD_LOCAL" -tAc \
    "select version from flyway_schema_history where success order by installed_rank desc limit 1")
V_REMOTA=$(ssh "$SSH_HOST" "$DC exec -T postgres psql -U $USUARIO -d $BD_REMOTA -tAc \
    \"select version from flyway_schema_history where success order by installed_rank desc limit 1\"" \
    2>/dev/null | tr -d ' \r\n')
echo "    local: V$V_LOCAL    $DESTINO: V$V_REMOTA"
if [[ "$V_LOCAL" != "$V_REMOTA" ]]; then
    echo "!! Los esquemas no coinciden. Despliega primero para que Flyway iguale el destino." >&2
    exit 1
fi

# ── 2. Confirmación explícita: esto sobrescribe datos ────────────────────────
if [[ "$ASUMIR_SI" != "1" ]]; then
    echo
    if [[ "$MODO" == "completo" ]]; then
        echo "    Se REEMPLAZA la base $BD_REMOTA entera (incluidos sus usuarios)."
    else
        echo "    Se REEMPLAZA el contenido de: ${TABLAS_CATALOGO[*]}"
    fi
    echo "    Se sobrescriben las imágenes del volumen $VOL_REMOTO."
    read -rp "    Escribe SI para continuar: " r
    [[ "$r" == "SI" ]] || { echo "    Cancelado."; exit 0; }
fi

# ── 3. Respaldo del destino, antes que nada ─────────────────────────────────
SELLO=$(date +%Y%m%d-%H%M%S)
echo "==> Respaldando $BD_REMOTA en el servidor"
ssh "$SSH_HOST" "$DC exec -T postgres pg_dump -U $USUARIO -d $BD_REMOTA -Fc" \
    > "$TRABAJO/respaldo.dump"
ssh "$SSH_HOST" "mkdir -p $REMOTO/backups"
scp -q "$TRABAJO/respaldo.dump" "$SSH_HOST:$REMOTO/backups/antes-de-migrar-$DESTINO-$SELLO.dump"
echo "    $REMOTO/backups/antes-de-migrar-$DESTINO-$SELLO.dump ($(du -h "$TRABAJO/respaldo.dump" | cut -f1))"

# ── 4. Volcado local ────────────────────────────────────────────────────────
echo "==> Volcando la base local"
if [[ "$MODO" == "completo" ]]; then
    docker exec "$PG_LOCAL" pg_dump -U "$USUARIO" -d "$BD_LOCAL" -Fc > "$TRABAJO/datos.dump"
else
    ARGS=(); for t in "${TABLAS_CATALOGO[@]}"; do ARGS+=(--table="$t"); done
    docker exec "$PG_LOCAL" pg_dump -U "$USUARIO" -d "$BD_LOCAL" \
        --data-only --column-inserts "${ARGS[@]}" > "$TRABAJO/datos.sql"
fi

# ── 5. El backend no puede estar escribiendo mientras restauramos ───────────
echo "==> Deteniendo el backend en $DESTINO"
ssh "$SSH_HOST" "$DC stop backend" >/dev/null 2>&1

restaurar() {
if [[ "$MODO" == "completo" ]]; then
    echo "==> Recreando el esquema y restaurando"
    ssh "$SSH_HOST" "$DC exec -T postgres psql -U $USUARIO -d $BD_REMOTA -v ON_ERROR_STOP=1 -c \
        'drop schema public cascade; create schema public;'" >/dev/null
    ssh "$SSH_HOST" "$DC exec -T postgres pg_restore -U $USUARIO -d $BD_REMOTA --no-owner" \
        < "$TRABAJO/datos.dump" 2>&1 | grep -vi "^$" | sed 's/^/    /' || true
else
    echo "==> Vaciando y cargando las tablas de catálogo"
    LISTA=$(IFS=,; echo "${TABLAS_CATALOGO[*]}")
    {
        echo "begin;"
        echo "set session_replication_role = replica;"   # sin verificar llaves foráneas
        echo "truncate $LISTA cascade;"
        cat "$TRABAJO/datos.sql"
        echo "set session_replication_role = default;"
        echo "commit;"
    } | ssh "$SSH_HOST" "$DC exec -T postgres psql -U $USUARIO -d $BD_REMOTA -v ON_ERROR_STOP=1 -q"
fi
}

if ! restaurar; then
    echo "!! Falló la restauración. Devolviendo el respaldo." >&2
    ssh "$SSH_HOST" "$DC exec -T postgres psql -U $USUARIO -d $BD_REMOTA -c \
        'drop schema public cascade; create schema public;'" >/dev/null
    ssh "$SSH_HOST" "$DC exec -T postgres pg_restore -U $USUARIO -d $BD_REMOTA --no-owner \
        $REMOTO/backups/antes-de-migrar-$DESTINO-$SELLO.dump" >/dev/null 2>&1 || true
    ssh "$SSH_HOST" "$DC start backend" >/dev/null
    exit 1
fi

# ── 6. Las imágenes: viven en un volumen, no en la base ─────────────────────
echo "==> Copiando las imágenes de producto"
docker run --rm -v "$VOL_LOCAL":/u alpine tar czf - -C /u . > "$TRABAJO/uploads.tgz"
echo "    $(du -h "$TRABAJO/uploads.tgz" | cut -f1) · $(docker run --rm -v "$VOL_LOCAL":/u alpine sh -c 'find /u -type f | wc -l' | tr -d ' ') archivos"
scp -q "$TRABAJO/uploads.tgz" "$SSH_HOST:/tmp/uploads-$SELLO.tgz"
ssh "$SSH_HOST" "docker run --rm -v $VOL_REMOTO:/u -v /tmp:/b alpine \
    tar xzf /b/uploads-$SELLO.tgz -C /u && rm -f /tmp/uploads-$SELLO.tgz"

# ── 7. Arrancar y comprobar ─────────────────────────────────────────────────
echo "==> Arrancando el backend"
ssh "$SSH_HOST" "$DC start backend" >/dev/null
for i in $(seq 1 30); do
    if ssh "$SSH_HOST" "$DC exec -T backend curl -fsS http://localhost:8080/actuator/health" 2>/dev/null | grep -q '"UP"'; then
        break
    fi
    sleep 3
done

echo "==> Resultado en $DESTINO:"
ssh "$SSH_HOST" "$DC exec -T postgres psql -U $USUARIO -d $BD_REMOTA -tAc \
    \"select 'productos: '||count(*)||' · con imagen: '||count(*) filter (where image_path is not null) from products\"" \
    2>/dev/null | tr -d '\r' | sed 's/^/    /'
ssh "$SSH_HOST" "docker run --rm -v $VOL_REMOTO:/u alpine sh -c 'find /u -type f | wc -l'" \
    2>/dev/null | tr -d ' \r' | sed 's/^/    archivos de imagen: /'
echo "==> Listo. Respaldo por si acaso: backups/antes-de-migrar-$DESTINO-$SELLO.dump"
