---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# Producto

## Qué es

Representa una especie de pescado o marisco que la pescadería comercializa. Es el agregado raíz del dominio de inventario.

## Atributos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria generada en la app |
| `nombre` | String | Nombre común (ej. "Merluza", "Camarón") |
| `tipo` | Enum | `PESCADO`, `MARISCO`, `OTRO` |
| `unidadMedida` | Enum | `KG` o `UNIDAD` — define cómo se descuenta el stock |
| `stockActual` | BigDecimal | Cantidad actual en inventario |
| `stockMinimo` | BigDecimal | Umbral para generar alerta de stock bajo |
| `activo` | Boolean | Soft delete lógico |
| `deletedAt` | Timestamp | Fecha de baja (soft delete) |

## Reglas de negocio

- `stockActual` nunca puede ser negativo. Cualquier operación que lo intente debe ser rechazada con `StockInsuficienteException`.
- Si `stockActual <= stockMinimo` al finalizar un movimiento de salida, se genera una [[alerta]] de tipo `STOCK_MINIMO`.
- La `unidadMedida` es inmutable una vez creado el producto (cambiarla requeriría recalcular todos los movimientos históricos).

## Relaciones

- Tiene muchos [[lote|Lotes]]
- Participa en muchos [[movimiento-inventario|MovimientosInventario]]
- Participa en muchas [[venta|Ventas]]
- Puede tener [[alerta|Alertas]] activas

## Tabla en BD

```sql
CREATE TABLE productos (
    id          UUID PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    tipo        VARCHAR(20)  NOT NULL,
    unidad_medida VARCHAR(10) NOT NULL,
    stock_actual NUMERIC(10,3) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```
