---
tags: [modulo, finance]
fecha: 2026-06-21
---

# Módulo: Finance (Finanzas)

## Responsabilidad

Controla el dinero del negocio: caja registradora, gastos operacionales, facturación fiscal y el registro contable básico. Recibe eventos de Sales y Procurement para generar documentos financieros.

## Aggregate Roots

- **CajaRegistradora** — [[modules/finance/entities/cash-register]]
- **Gasto** — [[modules/finance/entities/expense]]
- **Factura** — [[modules/finance/entities/invoice]]

## Sub-dominios

| Sub-dominio | Descripción |
|-------------|-------------|
| **Caja** | Control del efectivo físico, arqueo diario |
| **Gastos** | Egresos no relacionados con compra de mercancía |
| **Facturación** | Documentos fiscales de ventas y compras |
| **Contabilidad** | Asientos contables básicos (libro diario) |

## Flujos que llegan a Finance

| Evento | Origen | Acción en Finance |
|--------|--------|------------------|
| `SesiónPOSCerrada` | Sales | Registra movimiento de cierre en Caja |
| `VentaConfirmada` | Sales | Genera Factura de venta si se requiere |
| `OrdenCompraRecibida` | Procurement | Registra factura de compra |

## Reglas de negocio

1. La Caja solo puede tener una sesión activa (controlado desde Sales/POS)
2. Los gastos requieren categoría y monto positivo
3. Una factura emitida no puede modificarse — se emite nota de crédito
4. El arqueo de caja registra la diferencia (sobrante/faltante) sin ajustarla automáticamente

## Dependencias

| Dirección | Módulo | Cómo |
|-----------|--------|------|
| Recibe eventos de | Sales | `VentaConfirmada`, `SesiónPOSCerrada` |
| Recibe eventos de | Procurement | `MercancíaRecibida` |
| Consumido por | Reports | Para reportes financieros |

## Paquete Java

`com.sapiens.erp.modules.finance`

## Endpoints

`/api/v1/caja`, `/api/v1/gastos`, `/api/v1/facturas`

## Ver también

- [[modules/finance/entities/cash-register]]
- [[modules/finance/entities/expense]]
- [[modules/finance/entities/invoice]]
