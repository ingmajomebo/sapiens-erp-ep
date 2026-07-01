---
tags: [overview, proyecto]
fecha: 2026-06-21
---

# Sapiens ERP — Visión General

## Qué es

Sistema ERP de gestión de inventario para una **pescadería**. Digitaliza el control de stock, entradas de mercancía, ventas, proveedores y alertas de vencimiento.

## Objetivos

1. Eliminar la gestión manual de inventario (papel, hojas de cálculo)
2. Alertar proactivamente sobre stock bajo y productos próximos a vencer
3. Registrar todos los movimientos para trazabilidad completa
4. Proveer reportes de rotación, mermas y rentabilidad por producto

## Stack

- **Backend**: Java 21 + Spring Boot 3.x + Spring Security (JWT)
- **Frontend**: React 18 + TypeScript + Vite
- **BD**: PostgreSQL 16 con migraciones Flyway
- **Build**: Gradle Wrapper (`./gradlew`)

## Módulos principales

| Módulo | Estado |
|--------|--------|
| Gestión de productos | Pendiente |
| Control de lotes | Pendiente |
| Movimientos de inventario | Pendiente |
| Proveedores | Pendiente |
| Ventas | Pendiente |
| Alertas | Pendiente |
| Autenticación y roles | Pendiente |

## Reglas de negocio críticas

- El stock **nunca** puede quedar negativo
- Lotes con vencimiento a ≤2 días (configurable) generan alerta automática
- La unidad de medida (kg vs. unidad) define cómo se descuenta el stock

## Links relacionados

- [[domain/producto]]
- [[domain/lote]]
- [[architecture/stack]]
