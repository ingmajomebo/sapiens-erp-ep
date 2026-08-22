# Mover `agenda` al Caddy del borde

`agenda` tiene hoy su propio Caddy ocupando los puertos 80 y 443. La
migración es sencilla porque **es el mismo software**: su configuración se
traslada casi literal a `sites/agenda.caddy`.

Y hay una ventaja concreta: el borde **reutiliza el volumen de certificados
del Caddy de agenda** (`agenda_caddy_data`). Los certificados ya emitidos
siguen ahí, así que no hay que pedirlos de nuevo ni gastar cuota de
Let's Encrypt. El corte se reduce a lo que tarda un contenedor en arrancar.

Único cambio en la configuración: los destinos pasan de `api:3001` y
`web:3000` a `agenda-api:3001` y `agenda-web:3000`, porque el Caddy ya no
vive dentro de la red del proyecto.

---

## 1. Preparar agenda

En `/opt/agenda/docker-compose.yml`:

**Servicio `web`** — añadir:

```yaml
    networks:
      default:
      edge:
        aliases:
          - agenda-web
```

**Servicio `api`** — añadir:

```yaml
    networks:
      default:
      edge:
        aliases:
          - agenda-api
```

**Servicio `caddy`** — comentarlo entero.

Al final del archivo:

```yaml
networks:
  default:
  edge:
    external: true
    name: edge
```

---

## 2. El corte

```bash
cd /opt/agenda
cp docker-compose.yml docker-compose.yml.bak    # para poder volver

docker network create edge

# Conectar agenda a la red del borde sin reiniciar nada
docker compose up -d web api

# Soltar los puertos
docker compose stop caddy

# Levantar el borde (hereda los certificados del volumen)
cd /opt/edge && docker compose up -d

docker logs -f edge-caddy-1
```

Comprobar:

```bash
curl -I https://sapiensflowmas.online
```

---

## 3. Si algo sale mal

```bash
cd /opt/edge   && docker compose down
cd /opt/agenda && docker compose start caddy
```

Vuelve en segundos. El Caddy de agenda conserva su configuración y sus
certificados intactos.

> El volumen `agenda_caddy_data` lo comparten los dos mientras dure la
> transición. No lo borres: es donde viven los certificados.

---

## 4. Cuando esté estable

Retirar el Caddy de agenda del todo:

```bash
cd /opt/agenda
docker compose rm -f caddy
rm Caddyfile docker-compose.yml.bak
```

**No borres `agenda_caddy_data`**: ahora es el almacén de certificados del
borde. Si lo eliminas, Caddy los vuelve a pedir todos y Let's Encrypt tiene
un límite de cinco emisiones por dominio y semana.
