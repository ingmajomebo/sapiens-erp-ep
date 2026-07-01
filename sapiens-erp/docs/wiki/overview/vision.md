---
tags: [overview, vision]
fecha: 2026-06-21
---

# Visión del Proyecto — Sapiens ERP

## Qué es

**Sapiens ERP** es un sistema de gestión empresarial diseñado para pescaderías. Digitaliza y centraliza las operaciones del negocio: desde la compra de mercancía al proveedor hasta la venta al cliente en el mostrador, pasando por el control de stock, mermas, caja y contabilidad básica.

## Problema que resuelve

Las pescaderías suelen operar con:
- Cuadernos o Excel para el inventario
- Cálculo manual del stock disponible
- Sin trazabilidad de mermas
- Sin control de vencimientos
- Sin histórico de movimientos para tomar decisiones

Sapiens ERP elimina estos problemas con un sistema que registra **cada movimiento** y calcula el estado actual a partir de ese historial.

## Objetivos del sistema

1. **Trazabilidad total** — Todo cambio en el stock queda registrado con fecha, usuario y motivo
2. **Stock confiable** — El stock es calculado, nunca editado directamente
3. **Alertas proactivas** — Stock bajo y vencimientos se detectan automáticamente
4. **Operación en mostrador** — POS rápido para ventas en caja
5. **Cierre diario** — Caja con arqueo y resumen del día
6. **Reportes de negocio** — Rotación, mermas, rentabilidad por producto

## Alcance actual

| Módulo | Incluido |
|--------|----------|
| Gestión de productos y catálogo | ✅ |
| Control de inventario y movimientos | ✅ |
| Mermas | ✅ |
| Gestión de proveedores y compras | ✅ |
| Gestión de clientes | ✅ |
| Ventas y POS | ✅ |
| Caja registradora | ✅ |
| Gastos | ✅ |
| Facturación | ✅ |
| Contabilidad básica | ✅ |
| Reportes | ✅ |
| Usuarios y roles | ✅ |

## Usuarios del sistema

| Rol | Perfil | Acceso |
|-----|--------|--------|
| `ADMIN` | Dueño o gerente | Configuración total, reportes, usuarios |
| `SUPERVISOR` | Encargado de turno | Inventario, compras, ventas, caja |
| `OPERADOR` | Vendedor / cajero | POS, ventas, consulta de stock |

## Stack tecnológico

- **Backend**: Java 21 + Spring Boot 3.x (Gradle Wrapper)
- **Frontend**: React 18 + TypeScript + Vite
- **Base de datos**: PostgreSQL 16 + Flyway

## Ver también

- [[overview/bounded-contexts]] — Cómo se dividen los módulos
- [[overview/cross-cutting]] — Reglas que aplican a todo el sistema
- [[architecture/overview]] — Arquitectura técnica
