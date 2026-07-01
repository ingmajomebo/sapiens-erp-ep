---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# Lote

## Qué es

Representa una entrada de mercancía de un [[proveedor]] específico. Cada lote tiene su propio precio de compra y fecha de vencimiento, lo que permite trazabilidad por partida y gestión FIFO.

## Atributos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `productoId` | UUID | FK → [[producto]] |
| `proveedorId` | UUID | FK → [[proveedor]] |
| `cantidad` | BigDecimal | Cantidad recibida (en unidad del producto) |
| `cantidadDisponible` | BigDecimal | Cantidad aún en inventario de este lote |
| `precioCompra` | BigDecimal | Precio por unidad/kg en esta compra |
| `fechaIngreso` | Date | Fecha de entrada al inventario |
| `fechaVencimiento` | Date | Fecha de vencimiento (nullable para productos sin vencimiento) |
| `numeroFactura` | String | Referencia del documento de compra |

## Reglas de negocio

- `cantidadDisponible` se descuenta con cada [[movimiento-inventario|MovimientoInventario]] de salida o merma.
- Si `fechaVencimiento - hoy <= umbralAlerta` (default 2 días, configurable), se genera una [[alerta]] de tipo `VENCIMIENTO_PROXIMO`.
- Un lote no puede tener `cantidadDisponible < 0`.
- La estrategia de descuento de lotes es **FIFO** (el lote más antiguo se agota primero).

## Relaciones

- Pertenece a un [[producto]]
- Fue provisto por un [[proveedor]]
- Sus movimientos se registran en [[movimiento-inventario]]

## Tabla en BD

```sql
CREATE TABLE lotes (
    id                  UUID PRIMARY KEY,
    producto_id         UUID NOT NULL REFERENCES productos(id),
    proveedor_id        UUID NOT NULL REFERENCES proveedores(id),
    cantidad            NUMERIC(10,3) NOT NULL,
    cantidad_disponible NUMERIC(10,3) NOT NULL,
    precio_compra       NUMERIC(12,2) NOT NULL,
    fecha_ingreso       DATE NOT NULL,
    fecha_vencimiento   DATE,
    numero_factura      VARCHAR(50),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
```
