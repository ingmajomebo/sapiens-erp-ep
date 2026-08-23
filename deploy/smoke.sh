#!/usr/bin/env bash
# Comprobación posterior al despliegue. Un contenedor "healthy" no significa
# que la aplicación sirva: esto verifica el camino completo que recorre un
# cliente real.
#
#   ./deploy/smoke.sh prod
#   ./deploy/smoke.sh dev
set -uo pipefail

ENVIRONMENT="${1:-prod}"
case "$ENVIRONMENT" in
    prod) STORE_PORT=8080; ERP_PORT=8081 ;;
    dev)  STORE_PORT=8090; ERP_PORT=8091 ;;
    *) echo "Uso: ./deploy/smoke.sh <dev|prod>" >&2; exit 1 ;;
esac

FALLOS=0

comprobar() { # descripción url código_esperado
    local desc="$1" url="$2" esperado="$3"
    local codigo
    codigo=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$url" 2>/dev/null)
    if [[ "$codigo" == "$esperado" ]]; then
        printf '  ✓ %-46s %s\n' "$desc" "$codigo"
    else
        printf '  ✗ %-46s %s (esperado %s)\n' "$desc" "$codigo" "$esperado"
        FALLOS=$((FALLOS + 1))
    fi
}

contiene() { # descripción url texto
    local desc="$1" url="$2" texto="$3"
    if curl -s -m 15 "$url" 2>/dev/null | grep -q "$texto"; then
        printf '  ✓ %-46s\n' "$desc"
    else
        printf '  ✗ %-46s no contiene «%s»\n' "$desc" "$texto"
        FALLOS=$((FALLOS + 1))
    fi
}

echo "== Comprobación de $ENVIRONMENT =="

# La tienda sirve y resuelve sus rutas
comprobar "Tienda · portada"            "http://127.0.0.1:$STORE_PORT/"           200
comprobar "Tienda · catálogo (ruta SPA)" "http://127.0.0.1:$STORE_PORT/productos" 200

# La API responde a través del proxy de la tienda, que es como la llama
# el navegador. Si esto falla, el catálogo sale vacío aunque el backend esté vivo.
contiene "Tienda · API en su mismo origen" \
         "http://127.0.0.1:$STORE_PORT/api/v1/public/catalog" '"products"'

# El backend está sano y llegó a la base
contiene "Backend · estado"             "http://127.0.0.1:$STORE_PORT/actuator/health" '"status":"UP"'

# El panel administrativo carga
comprobar "ERP · portada"               "http://127.0.0.1:$ERP_PORT/"             200

# La seguridad sigue puesta: sin token no se entra
comprobar "ERP · API protegida sin token" "http://127.0.0.1:$ERP_PORT/api/v1/products" 401

echo
if [[ $FALLOS -eq 0 ]]; then
    echo "== $ENVIRONMENT responde correctamente =="
else
    echo "== $FALLOS comprobación(es) fallida(s) en $ENVIRONMENT ==" >&2
    exit 1
fi
