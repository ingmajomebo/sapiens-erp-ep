# Convivencia en el VPS

Dos sistemas en el mismo servidor, y **ninguno se corta para levantar el otro**.

```
VPS
├── agenda    sapiensflowmas.online          ← ya en producción, intacto
└── encanto   encantopacificoerp.online      ← se suma
                admin. / dev. / dev-admin.
```

## Cómo comparten el puerto 443

Solo un proceso puede escuchar en el 443 de una IP, y ese proceso es el Caddy
que ya sirve a `agenda`. En vez de sustituirlo —lo que obligaría a pararlo—,
Encanto **se cuelga de él**:

1. Sus contenedores web se unen a la red `edge` con un alias estable.
2. `apply-sites.sh` añade los bloques de Encanto a la configuración de Caddy.
3. `caddy reload` intercambia la configuración **en caliente**.

`caddy reload` no reinicia el proceso ni cierra conexiones: cambia la
configuración en memoria. Y si la nueva es inválida, la rechaza y sigue
sirviendo la anterior. `docker network connect` tampoco reinicia nada.

**agenda no se detiene en ningún momento.**

## Publicar o actualizar los sitios

```bash
cd /opt/encanto
./deploy/edge/apply-sites.sh
```

El script:

- guarda la configuración original de agenda como `Caddyfile.base` la primera
  vez, y a partir de ahí esa base es la fuente de verdad de agenda;
- crea la red `edge` y conecta el proxy si hace falta;
- genera la configuración final concatenando la base con `sites/*.caddy`;
- **la valida dentro del contenedor antes de tocar el archivo en producción**;
- aplica y recarga, con vuelta atrás automática si la recarga falla.

Nuestra configuración vive en este repositorio. La de agenda, en su base.
Ninguno edita el archivo del otro.

## Por qué el Caddyfile es generado

El Caddy de agenda monta **un solo archivo**, no un directorio. No se puede
importar el nuestro desde fuera sin recrear el contenedor — y recrearlo sí
sería un corte. Generar el archivo combinado es lo que permite mantener las
dos configuraciones separadas sin tocar el contenedor.

Por eso `/opt/agenda/Caddyfile` lleva una marca de generado. Para cambiar la
configuración de agenda se edita `Caddyfile.base` y se vuelve a ejecutar el
script.

## Los archivos de sitio

| Archivo | Estado |
|---|---|
| `sites/encanto.caddy` | Producción: tienda y panel |
| `sites/encanto-dev.caddy.example` | Desarrollo: **inactivo** hasta renombrarlo |

Desarrollo nace inactivo a propósito. Lleva una contraseña, y un hash mal
pegado impide cargar la configuración **completa** — se llevaría por delante
también a agenda. Como `apply-sites.sh` solo recoge `*.caddy`, mientras no lo
renombres no puede afectar a nada.

Para activarlo:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'TU_CLAVE'
# pegar el hash en los dos bloques
mv sites/encanto-dev.caddy.example sites/encanto-dev.caddy
./deploy/edge/apply-sites.sh
```

## Añadir otro proyecto en el futuro

Mismo patrón: unir sus servicios web a la red `edge` con un alias, dejar su
archivo en un `sites/` y regenerar. Si llegan a ser tres o cuatro proyectos,
conviene mover el proxy a `/opt/edge` como infraestructura sin dueño — pero
eso sí pide una ventana de mantenimiento, y hoy no hace falta.

## Diagnóstico

```bash
docker logs -f agenda-caddy-1                                  # certificados, errores
docker exec agenda-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker network inspect edge --format '{{range .Containers}}{{.Name}} {{end}}'

# Volver a la configuración inmediatamente anterior
cp /opt/agenda/Caddyfile.prev /opt/agenda/Caddyfile
docker exec agenda-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

| Síntoma | Causa habitual |
|---|---|
| 502 desde Caddy | El contenedor no está en `edge`, o el alias no coincide |
| Certificado no emite | El DNS del host no apunta al VPS, o el 80 no llega desde fuera |
| `apply-sites.sh` falla al validar | Error de sintaxis en `sites/`. No se cambió nada |
| agenda deja de responder | No debería. Restaurar con `Caddyfile.prev` y recargar |
