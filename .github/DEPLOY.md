# Despliegue automático

```
Pull request              ->  CI: tests + compilación + imágenes
merge a develop           ->  dev.encantopacificoerp.online      automático
merge a main              ->  encantopacificoerp.online          con aprobación
```

Las imágenes se construyen **una sola vez**, etiquetadas con el commit, y el
VPS descarga exactamente esas. No se compila en el servidor: lo que se aprobó
en desarrollo es el mismo binario que sale a producción.

---

## Configuración inicial

### 1. Clave de despliegue

En tu máquina, una clave **solo para el pipeline**, sin frase de paso:

```bash
ssh-keygen -t ed25519 -C "github-actions-encanto" -f ~/.ssh/encanto_deploy -N ""
```

Autorizarla en el VPS:

```bash
ssh-copy-id -i ~/.ssh/encanto_deploy.pub root@177.7.36.148
```

Es una clave aparte de la tuya a propósito: si un día hay que revocarle el
acceso al pipeline, se borra esa línea del `authorized_keys` y tu acceso
personal sigue intacto.

### 2. Token de solo lectura del registro

`github.com/settings/tokens` → *Generate new token (classic)* → **solo**
`read:packages`. Es el que usa el VPS para descargar; con él no se puede
publicar nada.

> Para subir imágenes **no hace falta ningún token**: Actions usa su
> `GITHUB_TOKEN` automático.

### 3. Secretos del repositorio

`Settings` → `Secrets and variables` → `Actions` → *New repository secret*

| Secreto | Valor |
|---|---|
| `VPS_HOST` | `177.7.36.148` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contenido de `~/.ssh/encanto_deploy` (la privada, completa) |
| `GHCR_READ_TOKEN` | El token con `read:packages` |

### 4. Entornos

`Settings` → `Environments`

- **development** — sin restricciones.
- **production** — marcar *Required reviewers* y añadirte. Así un merge a
  `main` construye y espera tu aprobación antes de tocar producción.

Es la única barrera entre un merge y los clientes. Vale la pena ponerla.

### 5. El VPS

Una sola vez:

```bash
ssh root@177.7.36.148
cd /opt/encanto
nano deploy/env/prod.env      # rellenar los secretos
nano deploy/env/dev.env
chmod 600 deploy/env/*.env
```

Ver [deploy/README.md](../deploy/README.md) para el detalle de cada variable.

---

## El día a día

```bash
git checkout develop
# ...trabajar...
git commit && git push
```

El pipeline prueba, construye y despliega en desarrollo. Se sigue en la
pestaña **Actions**.

Cuando esté aprobado:

```bash
git checkout main && git merge develop && git push
```

Construye, y **espera tu aprobación** antes de publicar.

---

## Si algo falla

| Dónde falla | Qué significa |
|---|---|
| `test` | Un test roto. No se construye ni se despliega nada |
| `build` | Una imagen no compila. Nada llegó al servidor |
| `dev` / `prod` | El código llegó pero el stack no arrancó. `release.sh` imprime los logs del backend |

Volver atrás, en el VPS:

```bash
cd /opt/encanto && ./deploy/rollback.sh prod
```

Revierte el código, **no la base de datos**. Si el despliegue aplicó una
migración, sigue aplicada — por eso `release.sh` respalda antes de migrar en
producción.

---

## Por qué está montado así

**Los tests corren antes de construir.** Construir tres imágenes para
descubrir después que un test falla es tiempo tirado.

**Un solo `release.sh` para las dos ramas**, en una acción compartida. Si el
procedimiento de desarrollo y el de producción viven en sitios distintos, se
desincronizan y lo descubres el peor día.

**El despliegue no se cancela a mitad.** El CI sí cancela ejecuciones viejas,
pero cortar un despliegue en curso deja el stack a medias.

**La huella del servidor se fija con `ssh-keyscan`.** Sin eso, un DNS
secuestrado bastaría para entregar el stack a otra máquina.

**La clave privada se borra al terminar**, incluso si el paso falla.
