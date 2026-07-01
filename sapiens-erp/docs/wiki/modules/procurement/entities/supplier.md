---
tags: [procurement, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Proveedor

**Módulo**: [[modules/procurement/module]]
**Tipo**: Aggregate Root

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `nombre` | `VARCHAR(150)` | `String` | Razón social o nombre comercial |
| `ruc` | `VARCHAR(20)` | `String` | RUC / identificación fiscal (único) |
| `telefono` | `VARCHAR(20)` | `String` | Contacto principal |
| `email` | `VARCHAR(100)` | `String` | Correo de contacto |
| `direccion` | `VARCHAR(255)` | `String` | Dirección física |
| `condiciones_pago` | `VARCHAR(50)` | `String` | Ej. "Contado", "30 días" |
| `activo` | `BOOLEAN` | `boolean` | Soft delete |
| `deleted_at` | `TIMESTAMP` | `Instant` | Fecha de baja |
| `created_at` | `TIMESTAMP` | `Instant` | Auditoría |
| `updated_at` | `TIMESTAMP` | `Instant` | Auditoría |

## Reglas

- `ruc` es único entre proveedores activos
- Un proveedor dado de baja no puede recibir nuevas órdenes de compra
- El historial de órdenes de un proveedor dado de baja se conserva

## Tabla en BD

```sql
CREATE TABLE proveedores (
    id               UUID         PRIMARY KEY,
    nombre           VARCHAR(150) NOT NULL,
    ruc              VARCHAR(20)  UNIQUE,
    telefono         VARCHAR(20),
    email            VARCHAR(100),
    direccion        VARCHAR(255),
    condiciones_pago VARCHAR(50),
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at       TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## Ver también

- [[modules/procurement/entities/purchase-order]]
- [[modules/procurement/module]]
