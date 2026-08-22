# Migrar `agenda` detrás de Traefik

`agenda` hoy tiene su propio Caddy ocupando los puertos 80 y 443. Para que
Traefik sea el único borde del VPS, ese Caddy debe soltarlos.

Su enrutamiento actual es sencillo y se traduce sin pérdida:

| Caddy | Traefik |
|---|---|
| `handle /api/*` → `api:3001` | router con `PathPrefix(/api)` |
| `handle /v1/*` → `api:3001` | mismo router, segundo prefijo |
| `handle` (resto) → `web:3000` | router sin prefijo, prioridad menor |
| `request_body max_size 25MB` | `buffering.maxRequestBodyBytes` |

---

## 1. Editar `/opt/agenda/docker-compose.yml`

En el servicio **`web`**, añadir:

```yaml
    networks: [default, edge]
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=edge"
      - "traefik.http.routers.agenda-web.rule=Host(`sapiensflowmas.online`) || Host(`www.sapiensflowmas.online`)"
      - "traefik.http.routers.agenda-web.entrypoints=websecure"
      - "traefik.http.routers.agenda-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.agenda-web.priority=1"
      - "traefik.http.services.agenda-web.loadbalancer.server.port=3000"
```

En el servicio **`api`**, añadir:

```yaml
    networks: [default, edge]
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=edge"
      - "traefik.http.routers.agenda-api.rule=(Host(`sapiensflowmas.online`) || Host(`www.sapiensflowmas.online`)) && (PathPrefix(`/api`) || PathPrefix(`/v1`))"
      - "traefik.http.routers.agenda-api.entrypoints=websecure"
      - "traefik.http.routers.agenda-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.agenda-api.priority=10"
      - "traefik.http.routers.agenda-api.middlewares=agenda-body@docker"
      - "traefik.http.services.agenda-api.loadbalancer.server.port=3001"
      - "traefik.http.middlewares.agenda-body.buffering.maxRequestBodyBytes=26214400"
```

> La prioridad importa: `api` es 10 y `web` es 1, para que las rutas con
> prefijo ganen sobre el comodín. Caddy resolvía esto por especificidad;
> Traefik quiere el número explícito.

**Comentar o borrar el servicio `caddy` completo**, y añadir al final:

```yaml
networks:
  default:
  edge:
    external: true
    name: edge
```

---

## 2. La ventana de corte

Entre que Caddy suelta los puertos y Traefik obtiene el certificado,
`sapiensflowmas.online` no responde. Suele durar **menos de un minuto**.

```bash
cd /opt/agenda
cp docker-compose.yml docker-compose.yml.bak      # para poder volver
cp Caddyfile Caddyfile.bak

docker compose stop caddy                          # libera 80 y 443

cd /opt/edge && docker compose up -d               # Traefik toma los puertos

cd /opt/agenda && docker compose up -d web api     # se registran solos

# Seguir la emisión del certificado
docker logs -f edge-traefik-1
```

Comprobar:

```bash
curl -I https://sapiensflowmas.online
```

---

## 3. Si algo sale mal

```bash
cd /opt/edge   && docker compose down
cd /opt/agenda && cp docker-compose.yml.bak docker-compose.yml && docker compose up -d
```

Vuelve en el mismo minuto. Caddy conserva sus certificados en su volumen,
así que no hay que reemitir nada.

---

## 4. Cuando esté estable

Retirar el Caddy de agenda del todo:

```bash
cd /opt/agenda
docker compose rm -f caddy
docker volume rm agenda_caddy_data agenda_caddy_config agenda_caddy_logs
```

No antes: mientras existan, el rollback es inmediato.
