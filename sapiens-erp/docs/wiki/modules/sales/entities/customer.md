---
tags: [sales, entidad, aggregate-root]
fecha: 2026-06-21
---

# Entidad: Cliente

**Módulo**: [[modules/sales/module]]
**Tipo**: Aggregate Root

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `nombre` | `VARCHAR(150)` | `String` | Nombre o razón social |
| `ruc_dni` | `VARCHAR(20)` | `String` | Documento de identidad (único) |
| `tipo_documento` | `VARCHAR(10)` | `TipoDocumento` | `RUC`, `DNI`, `CE` |
| `telefono` | `VARCHAR(20)` | `String` | Contacto |
| `email` | `VARCHAR(100)` | `String` | Correo |
| `direccion` | `VARCHAR(255)` | `String` | Dirección |
| `activo` | `BOOLEAN` | `boolean` | Soft delete |
| `deleted_at` | `TIMESTAMP` | `Instant` | Fecha de baja |
| `created_at` | `TIMESTAMP` | `Instant` | Auditoría |

## Tabla en BD

```sql
CREATE TABLE clientes (
    id             UUID        PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    ruc_dni        VARCHAR(20),
    tipo_documento VARCHAR(10),
    telefono       VARCHAR(20),
    email          VARCHAR(100),
    direccion      VARCHAR(255),
    activo         BOOLEAN     NOT NULL DEFAULT TRUE,
    deleted_at     TIMESTAMP,
    created_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (ruc_dni) WHERE deleted_at IS NULL
);
```

## Ver también

- [[modules/sales/entities/sale]]
- [[modules/sales/module]]
