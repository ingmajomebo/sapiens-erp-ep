# Sapiens ERP — Pescadería

ERP de gestión de inventario para pescadería. Cubre compras, inventario, ventas, caja, facturación y contabilidad.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21 + Spring Boot 3.x |
| Frontend | React 18 + TypeScript + Vite |
| Base de datos | PostgreSQL 16 |
| Migraciones | Flyway |
| Autenticación | JWT stateless |

---

## Inicio rápido

### Prerequisitos

- **Docker Desktop** — para PostgreSQL
- **Java 21+** — para el backend
- **Node.js 18+** — para el frontend

### Un solo comando

```bash
./dev.sh
```

El script hace todo automáticamente:
1. Levanta PostgreSQL en Docker
2. Espera a que la BD esté lista
3. Arranca el backend en `:8080`
4. Instala dependencias del frontend si hace falta
5. Arranca el frontend en `:5173`
6. Muestra los logs de ambos servicios

Presiona **Ctrl+C** para detener todo.

---

## Inicio manual (paso a paso)

### 1. Base de datos

```bash
docker compose up -d
```

PostgreSQL queda disponible en `localhost:5432`.

### 2. Backend

```bash
cd backend
./gradlew bootRun
```

API disponible en `http://localhost:8080/api/v1`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

---

## Credenciales por defecto

| Campo | Valor |
|---|---|
| Email | `admin@sapiens.com` |
| Contraseña | `Admin1234!` |
| Rol | `ADMIN` |

> El usuario se crea automáticamente al primer arranque si no existe.

---

## Variables de entorno (backend)

Todas tienen valores por defecto para desarrollo local. Solo cambiar en producción.

| Variable | Default | Descripción |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/sapiens_erp` | URL de PostgreSQL |
| `DB_USER` | `sapiens` | Usuario de BD |
| `DB_PASSWORD` | `sapiens` | Contraseña de BD |
| `JWT_SECRET` | *(ver application.yml)* | Secret para firmar tokens — **cambiar en prod** |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido en CORS |

---

## Endpoints principales

```
POST   /api/v1/auth/login          Autenticación
POST   /api/v1/auth/refresh        Renovar token

GET    /api/v1/products            Lista de productos
POST   /api/v1/products            Crear producto
GET    /api/v1/categories          Lista de categorías
POST   /api/v1/categories          Crear categoría

GET    /api/v1/inventory/stock     Stock actual por producto
POST   /api/v1/inventory/entries   Registrar entrada (aumenta stock)
POST   /api/v1/inventory/exits     Registrar salida (reduce stock)
POST   /api/v1/inventory/wastes    Registrar merma
GET    /api/v1/inventory/movements Historial de movimientos

GET    /api/v1/suppliers           Lista de proveedores
POST   /api/v1/suppliers           Crear proveedor
PUT    /api/v1/suppliers/{id}      Editar proveedor
DELETE /api/v1/suppliers/{id}      Eliminar proveedor (soft delete)
```

---

## Comandos útiles

```bash
# Backend
cd backend
./gradlew test          # Ejecutar tests
./gradlew clean build   # Build de producción

# Frontend
cd frontend
npm run build           # Build de producción
npm run lint            # Linting

# Base de datos
docker compose up -d            # Levantar PostgreSQL
docker compose down             # Detener PostgreSQL
docker compose down -v          # Detener y borrar datos

# Ver logs de un servicio arrancado con dev.sh
tail -f /tmp/sapiens-backend.log
tail -f /tmp/sapiens-frontend.log
```

---

## Estructura del proyecto

```
sapiens-erp-ep/
├── dev.sh                     ← Script de inicio rápido
├── docker-compose.yml          ← PostgreSQL en Docker
├── backend/
│   ├── gradlew                 ← Siempre usar este (nunca gradle global)
│   └── src/main/java/com/sapiens/erp/
│       └── modules/
│           ├── catalog/        ← Productos y categorías
│           ├── inventory/      ← Stock y movimientos (core)
│           ├── procurement/    ← Proveedores
│           └── identity/       ← Usuarios y JWT
└── frontend/
    └── src/
        ├── features/           ← Un directorio por módulo
        ├── shared/             ← Componentes reutilizables
        ├── store/              ← Estado global (Zustand)
        └── api/                ← Cliente HTTP (Axios)
```

---

## Flujo de inventario

El stock **nunca se edita directamente**. Se calcula sumando movimientos:

```
Entrada de compra  → POST /api/v1/inventory/entries   (+stock)
Venta / salida     → POST /api/v1/inventory/exits      (-stock)
Merma              → POST /api/v1/inventory/wastes     (-stock, requiere motivo)
```

Reglas importantes:
- Los movimientos son **inmutables** — no se editan ni eliminan
- Stock nunca puede ser negativo — error 422 si no hay suficiente
- FIFO para lotes — se consume el más antiguo primero
