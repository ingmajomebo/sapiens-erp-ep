---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# Proveedor

## Qué es

Empresa o persona natural que suministra productos a la pescadería.

## Atributos

| `id`              | UUID      | Clave primaria                  |
| ----------------- | --------- | ------------------------------- |
| `nombre`          | String    | Razón social o nombre comercial |
| `ruc`             | String    | RUC / identificación fiscal     |
| `telefono`        | String    | Contacto principal              |
| `email`           | String    | Correo de contacto              |
| `direccion`       | String    | Dirección física                |
| `condicionesPago` | String    | Ej. "Contado", "30 días"        |
| `activo`          | Boolean   | Soft delete lógico              |
| `deletedAt`       | Timestamp | Fecha de baja                   |
| Campo             | Tipo      | Descripción                     |

## Relaciones

- Provee muchos [[lote|Lotes]]

## Tabla en BD

```sql
CREATE TABLE proveedores (
    id                UUID PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    ruc               VARCHAR(20) UNIQUE,
    telefono          VARCHAR(20),
    email             VARCHAR(100),
    direccion         VARCHAR(255),
    condiciones_pago  VARCHAR(50),
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at        TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
```
