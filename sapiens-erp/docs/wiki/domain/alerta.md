---
tags: [dominio, entidad]
fecha: 2026-06-21
---

# Alerta

## Qué es

Notificación generada automáticamente por el sistema cuando se detecta una condición crítica en el inventario.

## Tipos

| Tipo | Disparador |
|------|-----------|
| `STOCK_MINIMO` | `stockActual <= stockMinimo` del [[producto]] |
| `VENCIMIENTO_PROXIMO` | `fechaVencimiento - hoy <= umbralDias` (default 2 días) en un [[lote]] |
| `LOTE_VENCIDO` | `fechaVencimiento < hoy` y aún hay `cantidadDisponible > 0` |

## Atributos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Clave primaria |
| `tipo` | Enum | Ver tabla de tipos |
| `productoId` | UUID | FK → [[producto]] |
| `loteId` | UUID | FK → [[lote]] (solo para alertas de vencimiento) |
| `mensaje` | String | Descripción legible |
| `estado` | Enum | `ACTIVA`, `RESUELTA`, `IGNORADA` |
| `fechaGeneracion` | Timestamp | Cuándo se creó |
| `fechaResolucion` | Timestamp | Cuándo fue atendida (nullable) |

## Reglas de negocio

- Las alertas se generan automáticamente; los usuarios no las crean manualmente.
- Una alerta del mismo tipo+producto no se duplica si ya existe una `ACTIVA`.
- El umbral de días para vencimiento es configurable en parámetros del sistema (default 2).
- Las alertas `LOTE_VENCIDO` deben resolverse obligatoriamente (merma o retiro del lote).

## Relaciones

- Asociada a un [[producto]]
- Puede estar asociada a un [[lote]]

## Tabla en BD

```sql
CREATE TABLE alertas (
    id                UUID PRIMARY KEY,
    tipo              VARCHAR(25) NOT NULL,
    producto_id       UUID NOT NULL REFERENCES productos(id),
    lote_id           UUID REFERENCES lotes(id),
    mensaje           VARCHAR(255) NOT NULL,
    estado            VARCHAR(15) NOT NULL DEFAULT 'ACTIVA',
    fecha_generacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_resolucion  TIMESTAMP
);
```
