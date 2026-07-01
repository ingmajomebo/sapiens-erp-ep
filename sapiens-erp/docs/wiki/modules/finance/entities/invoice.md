---
tags: [finance, entidad, factura]
fecha: 2026-06-21
---

# Entidad: Factura

**Módulo**: [[modules/finance/module]]
**Tipo**: Aggregate Root

## Qué es

Documento fiscal que formaliza una venta o compra. Una vez emitida, es inmutable — los ajustes se hacen mediante notas de crédito o débito.

## Tipos

| Tipo | Descripción |
|------|-------------|
| `VENTA` | Emitida al cliente al confirmar una venta |
| `COMPRA` | Recibida del proveedor al recepcionar mercancía |

## Atributos

| Campo | Tipo BD | Tipo Java | Descripción |
|-------|---------|-----------|-------------|
| `id` | `UUID` | `UUID` | Clave primaria |
| `numero` | `VARCHAR(20)` | `String` | Número de factura único |
| `tipo` | `VARCHAR(10)` | `TipoFactura` | `VENTA` o `COMPRA` |
| `referencia_id` | `UUID` | `UUID` | ID de la Venta o Compra relacionada |
| `tercero_nombre` | `VARCHAR(150)` | `String` | Nombre del cliente o proveedor |
| `tercero_ruc` | `VARCHAR(20)` | `String` | RUC del tercero |
| `subtotal` | `NUMERIC(12,2)` | `BigDecimal` | Base imponible |
| `impuesto` | `NUMERIC(12,2)` | `BigDecimal` | IGV u otro impuesto |
| `total` | `NUMERIC(12,2)` | `BigDecimal` | Total |
| `fecha_emision` | `DATE` | `LocalDate` | Fecha de emisión |
| `estado` | `VARCHAR(15)` | `EstadoFactura` | `EMITIDA`, `ANULADA` |

## Reglas

- Una factura emitida no se modifica — se anula y se emite una corrección
- La anulación requiere rol `SUPERVISOR` o superior

## Tabla en BD

```sql
CREATE TABLE facturas (
    id              UUID          PRIMARY KEY,
    numero          VARCHAR(20)   UNIQUE NOT NULL,
    tipo            VARCHAR(10)   NOT NULL,
    referencia_id   UUID,
    tercero_nombre  VARCHAR(150)  NOT NULL,
    tercero_ruc     VARCHAR(20),
    subtotal        NUMERIC(12,2) NOT NULL,
    impuesto        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL,
    fecha_emision   DATE          NOT NULL,
    estado          VARCHAR(15)   NOT NULL DEFAULT 'EMITIDA',
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

## Ver también

- [[modules/finance/module]]
- [[modules/sales/entities/sale]]
- [[modules/procurement/entities/purchase-order]]
