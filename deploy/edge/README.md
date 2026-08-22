# Estructura del VPS

Un proxy de borde, varios proyectos independientes.

```
/opt/
├── edge/                  Caddy. Único dueño de los puertos 80 y 443.
│   ├── docker-compose.yml
│   ├── Caddyfile          Solo opciones globales + import sites/*.caddy
│   └── sites/
│       ├── agenda.caddy   sapiensflowmas.online
│       └── encanto.caddy  encantopacificoerp.online + admin/dev/dev-admin
├── agenda/                Proyecto (sin proxy propio)
└── encanto/               Proyecto (sin proxy propio)
```

El borde **no pertenece a ningún proyecto**. Cada proyecto:

1. deja su archivo en `sites/`,
2. une sus servicios web a la red externa `edge` con un alias estable.

Añadir o retirar un proyecto no toca el archivo de los demás.

## Por qué así y no un Caddyfile único

Un solo archivo con todos los sitios funciona, pero cada despliegue obliga a
editar la configuración compartida, y un error de sintaxis afecta a todos.
Con un archivo por proyecto, el dueño de cada uno edita el suyo.

`caddy reload` **valida antes de aplicar**: si un archivo tiene un error, la
recarga se rechaza y Caddy sigue sirviendo la configuración anterior. Un
proyecto mal configurado no tumba a los demás.

## Reglas de la casa

1. **Solo `edge` publica puertos al exterior.** Los proyectos exponen como
   mucho en `127.0.0.1`, para diagnosticar desde el propio servidor.
2. **Solo los servicios web se unen a `edge`.** Las bases de datos y las APIs
   internas se quedan en la red interna del stack, fuera del alcance del proxy.
3. **Alias de red, no nombres de contenedor.** Un redespliegue cambia el
   contenedor; el alias no.
4. **Un archivo por proyecto en `sites/`**, con el nombre del proyecto.
5. **Los certificados los pide y renueva Caddy.** No hay certbot ni cron.

## Montaje inicial

```bash
mkdir -p /opt/edge && cd /opt/edge
# copiar docker-compose.yml, Caddyfile y sites/ desde deploy/edge/
cp .env.example .env && nano .env        # ACME_EMAIL

docker network create edge
docker compose up -d
```

Antes de arrancarlo hay que liberar los puertos 80 y 443:
ver [MIGRAR-AGENDA.md](MIGRAR-AGENDA.md).

## Añadir un proyecto nuevo

**1.** En su compose, al servicio que deba ser público:

```yaml
    networks:
      default:
      edge:
        aliases:
          - miproyecto-web

networks:
  default:
  edge:
    external: true
    name: edge
```

**2.** Un archivo `/opt/edge/sites/miproyecto.caddy`:

```caddy
midominio.com {
	encode gzip
	reverse_proxy miproyecto-web:80
}
```

**3.** Recargar:

```bash
docker exec edge-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Caddy emite el certificado solo. No hace falta reiniciar nada.

## Retirar un proyecto

```bash
rm /opt/edge/sites/miproyecto.caddy
docker exec edge-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

## Diagnóstico

```bash
docker logs -f edge-caddy-1                                    # certificados, errores
docker exec edge-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker network inspect edge --format '{{range .Containers}}{{.Name}} {{end}}'
```

| Síntoma | Causa habitual |
|---|---|
| 502 desde Caddy | El contenedor no está en la red `edge`, o el alias no coincide |
| Certificado no emite | El DNS del host no apunta al VPS, o el 80 no llega desde fuera |
| `caddy reload` falla | Error de sintaxis: `caddy validate` dice en qué archivo y línea |
| `Bind for 0.0.0.0:443 failed` | Otro proceso tiene el puerto: `ss -tlnp \| grep 443` |
| Certificados reemitidos sin motivo | Se perdió el volumen `caddy_data`. Ojo con los límites de Let's Encrypt |
