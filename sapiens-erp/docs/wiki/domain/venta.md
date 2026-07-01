---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# Venta

## Qué es

Registro de una transacción de salida de productos hacia un cliente. Genera [[movimiento-inventario|MovimientosInventario]] de tipo `SALIDA`.

## Atributos — Cabecera

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `numeroVenta` | String | Número correlativo |
| `fecha` | Timestamp | Fecha y hora de la venta |
| `usuarioId` | UUID | Vendedor |
| `total` | BigDecimal | Total calculado de los ítems |
| `estado` | Enum | `COMPLETADA`, `ANULADA` |

## Atributos — Ítem de Venta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `ventaId` | UUID | FK → Venta |
| `productoId` | UUID | FK → [[producto]] |
| `loteId` | UUID | FK → [[lote]] (lote de donde sale el stock) |
| `cantidad` | BigDecimal | Cantidad vendida |
| `precioUnitario` | BigDecimal | Precio de venta por unidad/kg |
| `subtotal` | BigDecimal | `cantidad * precioUnitario` |

## Reglas de negocio

- Al confirmar una venta se generan los `MovimientosInventario` correspondientes (uno por ítem).
- La anulación de una venta genera movimientos `AJUSTE_POSITIVO` para revertir el stock.
- El stock debe ser validado antes de confirmar: no se puede vender más de lo disponible.
- Los ítems usan estrategia **FIFO** para elegir el lote del que se descuenta.

## Relaciones

- Genera [[movimiento-inventario|MovimientosInventario]]
- Involucra [[producto|Productos]] y [[lote|Lotes]]

## Tablas en BD

```sql
CREATE TABLE ventas (
    id            UUID PRIMARY KEY,
    numero_venta  VARCHAR(20) UNIQUE NOT NULL,
    fecha         TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id    UUID NOT NULL,
    total         NUMERIC(12,2) NOT NULL,
    estado        VARCHAR(15) NOT NULL DEFAULT 'COMPLETADA'
);

CREATE TABLE items_venta (
    id              UUID PRIMARY KEY,
    venta_id        UUID NOT NULL REFERENCES ventas(id),
    producto_id     UUID NOT NULL REFERENCES productos(id),
    lote_id         UUID REFERENCES lotes(id),
    cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal        NUMERIC(12,2) NOT NULL
);
```
