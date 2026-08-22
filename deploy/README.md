# Despliegue — Encanto Pacífico

Dos ambientes en el mismo VPS. Se construye una vez, se prueba en desarrollo,
y a producción va **exactamente esa imagen**.

```
VPS Hostinger
├── encantopacificoerp.online          tienda      :8080   ┐
├── admin.encantopacificoerp.online    ERP         :8081   ├ stack encanto-prod
│                                pgdata_prod         ┘
├── dev.encantopacificoerp.online      tienda      :8090   ┐
└── dev-admin.encantopacificoerp.online ERP        :8091   ├ stack encanto-dev
                                 pgdata_dev          ┘
```

Cada stack tiene su base de datos, su volumen de archivos y su `JWT_SECRET`.
No comparten nada. Los dos ambientes de desarrollo van detrás de contraseña
básica de Nginx y con `X-Robots-Tag: noindex`.

---

## El flujo, de principio a fin

```
1. Trabajas en la rama develop
2. ./deploy/build-push.sh              (en tu Mac)  -> sube ghcr.io/…:a3f9c21
3. release.sh dev a3f9c21              (en el VPS)  -> dev.encantopacificoerp.online
4. Pruebas en dev
5. merge develop -> main
6. release.sh prod a3f9c21             (en el VPS)  -> encantopacificoerp.online
```

El paso 6 usa **la misma etiqueta** del paso 3. No se vuelve a compilar nada:
lo que aprobaste es el binario que sale a producción.

---

## 1. Preparar el VPS (una sola vez)

Ubuntu 22.04/24.04, como root:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git nginx apache2-utils

# Docker + Compose
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

> En Hostinger revisa también el firewall del panel: debe permitir 80 y 443.

Clonar y configurar:

```bash
git clone git@github.com:ingmajomebo/sapiens-erp-ep.git /opt/encanto
cd /opt/encanto

cp deploy/env/prod.env.example deploy/env/prod.env
cp deploy/env/dev.env.example  deploy/env/dev.env

openssl rand -base64 32   # PGPASSWORD de cada uno
openssl rand -base64 48   # JWT_SECRET de cada uno — DISTINTOS entre ambientes

nano deploy/env/prod.env
nano deploy/env/dev.env
chmod 600 deploy/env/*.env
```

Acceso al registro de imágenes (token de GitHub con permiso `read:packages`):

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u ingmajomebo --password-stdin
```

---

## 2. Caddy y certificados

El VPS ya sirve otro proyecto con **Caddy** en los puertos 80 y 443. En vez de
montar un segundo servidor web, Encanto se cuelga del que ya está.

```bash
# Red compartida entre el Caddy existente y los stacks de Encanto
docker network create edge
docker network connect edge agenda-caddy-1

# Contraseña para los ambientes de desarrollo
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'TU_CLAVE'
# pegar el hash en deploy/caddy/encanto.caddy (dos veces)

# Importar los bloques desde el Caddyfile que ya existe
echo 'import /opt/encanto/deploy/caddy/encanto.caddy' >> /opt/agenda/Caddyfile
docker exec agenda-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

Caddy pide y renueva los certificados solo. No hay certbot ni cron que
mantener.

**Antes de esto**, los subdominios deben tener registro A apuntando a la IP
del VPS: `admin.`, `dev.` y `dev-admin.`. El dominio raíz ya apunta.

## 3. Construir y publicar

**En tu máquina**, con el árbol limpio:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u ingmajomebo --password-stdin
./deploy/build-push.sh
```

Construye las tres imágenes etiquetadas con el commit corto y las sube.
Si hay cambios sin commitear, se detiene: una imagen etiquetada con un commit
tiene que contener ese commit exacto o la etiqueta miente.

**En el VPS**:

```bash
cd /opt/encanto && git pull
./deploy/release.sh dev a3f9c21
```

Pruebas en `dev.encantopacificoerp.online`. Cuando esté bien:

```bash
./deploy/release.sh prod a3f9c21
```

Producción pide confirmación escribiendo `publicar`, y **respalda la base
antes de aplicar migraciones**. Si el respaldo falla, no despliega.

---

## 4. Si algo sale mal

```bash
./deploy/rollback.sh prod
```

Vuelve a la etiqueta anterior. **No revierte la base de datos**: si el
despliegue aplicó una migración Flyway, esa migración sigue aplicada. Para
volver atrás también en datos hay que restaurar el respaldo:

```bash
docker compose --env-file deploy/env/prod.env -f docker-compose.stack.yml \
  exec -T postgres pg_restore -U sapiens -d sapiens_erp --clean --if-exists \
  < /var/backups/encanto/prod/db-FECHA.dump
```

Por eso conviene que las migraciones sean aditivas: agregar columnas nullables
en vez de renombrar o borrar.

---

## 5. Respaldos

```bash
crontab -e
```

```cron
0 3 * * * /opt/encanto/deploy/backup.sh prod >> /var/log/encanto-backup.log 2>&1
0 4 * * 0 /opt/encanto/deploy/backup.sh dev  >> /var/log/encanto-backup.log 2>&1
```

Guarda dump de Postgres y tarball de `uploads` (donde viven las imágenes de
producto) en `/var/backups/encanto/<ambiente>`, con 14 días de retención.

> Un respaldo en el mismo VPS no protege contra la pérdida del servidor.
> Copia el directorio fuera: rclone, `scp`, o snapshots de Hostinger.

---

## Operación diaria

```bash
P="docker compose --env-file deploy/env/prod.env -f docker-compose.stack.yml"
D="docker compose --env-file deploy/env/dev.env  -f docker-compose.stack.yml"

$P ps                      # estado de producción
$P logs -f backend         # logs
$P restart backend         # reiniciar un servicio
$P exec postgres psql -U sapiens -d sapiens_erp   # consola SQL
docker stats --no-stream   # consumo de los dos stacks
```

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué mirar |
|---|---|---|
| `release.sh` no encuentra la imagen | Falta `docker login ghcr.io` en el VPS, o no se hizo `build-push.sh` | `docker pull ghcr.io/ingmajomebo/erp-backend:TAG` a mano |
| Backend en `restarting` | Flyway falló o credenciales cambiadas | `$P logs backend`; ¿coincide `PGPASSWORD` con el volumen ya creado? |
| 502 en el navegador | El contenedor no está arriba | `$P ps` y `curl 127.0.0.1:8080` |
| Login falla tras desplegar | Cambió `JWT_SECRET` | Esperado: los tokens viejos se invalidan. Volver a entrar |
| El VPS se queda sin RAM | Los dos stacks compiten | `docker stats`; considerar apagar dev cuando no se use: `$D stop` |

---

## Nota sobre `PGPASSWORD`

Solo se aplica **la primera vez** que se crea el volumen. Si lo cambias después
en el `.env`, Postgres conserva el original y el backend no conectará. Para
cambiarlo de verdad:

```bash
$P exec postgres psql -U sapiens -d sapiens_erp \
  -c "ALTER USER sapiens WITH PASSWORD 'nueva';"
```

y actualiza el `.env` con el mismo valor.
