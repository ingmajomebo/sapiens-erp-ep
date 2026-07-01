---
tags: [overview, ddd, bounded-contexts]
fecha: 2026-06-21
---

# Mapa de Contextos Acotados (Bounded Contexts)

## Los 7 contextos del dominio

```
┌─────────────────────────────────────────────────────────────────┐
│                        SAPIENS ERP                              │
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │ CATALOG  │────▶│  INVENTORY   │◀────│   PROCUREMENT    │    │
│  │          │     │  (CORE)      │     │                  │    │
│  │ Products │     │ Stock        │     │ Suppliers        │    │
│  │ Units    │     │ Movements    │     │ Purchase Orders  │    │
│  └──────────┘     │ Lots         │     └──────────────────┘    │
│                   │ Waste        │                              │
│  ┌──────────┐     └──────┬───────┘     ┌──────────────────┐    │
│  │ IDENTITY │            │◀────────────│     SALES        │    │
│  │          │            │             │                  │    │
│  │ Users    │            │             │ Customers        │    │
│  │ Roles    │            │             │ Sales / POS      │    │
│  └──────────┘     ┌──────▼───────┐     └──────────────────┘    │
│                   │   FINANCE    │                              │
│  ┌──────────┐     │              │                              │
│  │ REPORTS  │◀────│ Cash Reg.    │                              │
│  │          │     │ Expenses     │                              │
│  │ Cross-   │     │ Invoicing    │                              │
│  │ cutting  │     │ Accounting   │                              │
│  └──────────┘     └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Descripción de cada contexto

### Catalog — Catálogo
**Responsabilidad**: define qué productos existen y cómo se miden.
**Es el maestro de**: Producto, Categoría, Unidad de Medida.
**No sabe nada de**: stock, precios de venta, clientes.
**Relación**: es consumido por todos los demás contextos (referencia al `producto_id`).

### Inventory — Inventario *(Core Domain)*
**Responsabilidad**: registra cada cambio de stock y calcula el estado actual.
**Es el maestro de**: Movimiento, Lote, Merma.
**Regla fundamental**: el stock nunca se edita — se calcula desde movimientos.
**Relación**: recibe eventos de Procurement (entrada), Sales (salida) y genera alertas.

### Procurement — Compras
**Responsabilidad**: gestiona la relación con proveedores y el proceso de compra.
**Es el maestro de**: Proveedor, OrdenCompra, RecepciónMercancía.
**Genera**: eventos de entrada en Inventory al recibir mercancía.
**Relación**: upstream de Inventory.

### Sales — Ventas
**Responsabilidad**: gestiona la relación con clientes y el proceso de venta.
**Es el maestro de**: Cliente, Venta, ÍtemVenta, SesiónPOS.
**Genera**: eventos de salida en Inventory al confirmar ventas.
**Relación**: upstream de Inventory, downstream de Catalog.

### Finance — Finanzas
**Responsabilidad**: controla el dinero: caja, gastos, facturación y contabilidad.
**Es el maestro de**: CajaRegistradora, Gasto, Factura, AsientoContable.
**Genera**: documentos fiscales a partir de ventas y compras.
**Relación**: downstream de Sales y Procurement.

### Reports — Reportes
**Responsabilidad**: consultas y reportes transversales. Solo lectura.
**No posee entidades propias** — lee desde todos los contextos.
**Tipos de reporte**: rotación de productos, mermas, rentabilidad, cierre de caja.

### Identity — Identidad
**Responsabilidad**: autenticación y autorización de usuarios.
**Es el maestro de**: Usuario, Rol, Permiso.
**Relación**: transversal — todos los contextos consultan el usuario activo.

---

## Flujos de integración clave

| Evento | Origen | Destino | Efecto |
|--------|--------|---------|--------|
| MercancíaRecibida | Procurement | Inventory | Crea Lote + Movimiento ENTRADA |
| VentaConfirmada | Sales | Inventory | Crea Movimiento SALIDA (FIFO) |
| MermaRegistrada | Inventory | Inventory | Crea Movimiento MERMA |
| SesiónPOSCerrada | Sales | Finance | Genera resumen de caja |
| VentaConfirmada | Sales | Finance | Genera Factura |
| OrdenCompraRecibida | Procurement | Finance | Genera Factura de compra |

Ver detalle en [[architecture/integration-flows]].

---

## Reglas de integración entre contextos

1. Los contextos se comunican por **eventos de dominio**, no por llamadas directas entre repositorios
2. Cada contexto tiene su propia tabla en la BD — no hay JOINs que crucen contextos en la capa de dominio
3. Las referencias cruzadas usan IDs (UUID) — no objetos completos
4. El contexto Inventory es el único que puede calcular stock

## Ver también

- [[overview/vision]]
- [[overview/cross-cutting]]
- [[architecture/integration-flows]]
