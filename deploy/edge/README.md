# Estructura del VPS

Un proxy de borde, varios proyectos independientes.

```
/opt/
├── edge/          Traefik. Único dueño de los puertos 80 y 443.
├── agenda/        sapiensflowmas.online
└── encanto/       encantopacificoerp.online + admin/dev/dev-admin
```

Todos los proyectos se unen a la red externa **`edge`** y declaran sus rutas
con **etiquetas en su propio compose**. Traefik las descubre por el socket de
Docker y recarga solo.

Eso es lo que da la independencia: **añadir o retirar un proyecto no toca ni
un archivo de los demás**. Con Nginx habría un archivo central que editar cada
vez, y un `nginx -t` que puede tumbar todos los sitios a la vez.

## Reglas de la casa

1. **Solo `edge` publica puertos al exterior.** Los proyectos exponen sus
   servicios en `127.0.0.1` como mucho, para diagnosticar desde el servidor.
2. **`exposedByDefault: false`.** Un contenedor sin `traefik.enable=true` no
   queda expuesto por accidente.
3. **El socket de Docker se monta de solo lectura.** Traefik necesita ver los
   contenedores, no manejarlos.
4. **Un router por sitio, con nombre prefijado por el proyecto.** Dos
   proyectos no pueden pisarse el nombre del router.
5. **Los certificados los pide y renueva Traefik.** No hay certbot ni cron.

## Montaje inicial

```bash
mkdir -p /opt/edge && cd /opt/edge
# copiar docker-compose.yml, traefik.yml y .env desde deploy/edge/
cp .env.example .env && nano .env        # ACME_EMAIL

docker network create edge
docker compose up -d
```

Antes de arrancarlo hay que liberar los puertos 80 y 443:
ver [MIGRAR-AGENDA.md](MIGRAR-AGENDA.md).

## Añadir un proyecto nuevo

En su compose, al servicio que deba ser público:

```yaml
    networks: [default, edge]
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=edge"
      - "traefik.http.routers.MIPROYECTO.rule=Host(`midominio.com`)"
      - "traefik.http.routers.MIPROYECTO.entrypoints=websecure"
      - "traefik.http.routers.MIPROYECTO.tls.certresolver=letsencrypt"
      - "traefik.http.services.MIPROYECTO.loadbalancer.server.port=80"
```

Y al final del archivo:

```yaml
networks:
  default:
  edge:
    external: true
    name: edge
```

`docker compose up -d` y listo. No hay que reiniciar Traefik ni avisar a nadie.

## Ver el panel de Traefik

No está publicado. Se consulta con un túnel:

```bash
ssh -L 8088:127.0.0.1:8088 agenda-vps
# abrir http://localhost:8088/dashboard/
```

## Diagnóstico

```bash
docker logs -f edge-traefik-1                  # emisión de certificados, rutas
docker network inspect edge                    # quién está conectado
docker exec edge-traefik-1 cat /letsencrypt/acme.json | head -5
```

| Síntoma | Causa habitual |
|---|---|
| 404 de Traefik | El contenedor no está en la red `edge`, o le falta `traefik.enable=true` |
| Certificado no emite | El DNS del host no apunta al VPS, o el 80 no llega desde fuera |
| Sitio equivocado responde | Dos routers con la misma regla: revisar `priority` |
| `Bind for 0.0.0.0:443 failed` | Otro proceso tiene el puerto: `ss -tlnp \| grep 443` |
