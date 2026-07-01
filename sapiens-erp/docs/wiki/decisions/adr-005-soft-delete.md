---
tags: [adr, base-datos, soft-delete]
fecha: 2026-06-21
estado: Aceptado
---

# ADR-005: Soft Delete para Entidades de Negocio

## Estado

Aceptado

## Contexto

Las entidades de negocio (Producto, Proveedor, Cliente, Usuario) necesitan poder "eliminarse" desde la perspectiva del usuario, pero el historial de transacciones (ventas, compras, movimientos) referencia esas entidades y no puede quedar con FKs rotas.

## Decisión

Las entidades de negocio usan **soft delete**: una columna `deleted_at TIMESTAMP` que al tener valor indica que el registro está dado de baja. No se eliminan físicamente de la BD.

**Excepción**: Los registros de auditoría (`movimientos_inventario`, `log_*`) son **inmutables** — ni soft ni hard delete.

## Opciones consideradas

### Opción A: Soft delete con columna `deleted_at` ← Elegida

**Pros:**
- Las FKs del historial nunca quedan rotas
- El registro de baja queda auditado (fecha exacta)
- Se puede "restaurar" un registro dado de baja
- Las consultas de "activos" son `WHERE deleted_at IS NULL`

**Contras:**
- Requiere incluir `WHERE deleted_at IS NULL` en todas las consultas de activos
- Los índices unique deben ser parciales: `WHERE deleted_at IS NULL`
- Acumulación de registros inactivos con el tiempo

### Opción B: Hard delete

**Pros:** Tablas más limpias, consultas más simples

**Contras:**
- Violación de FK: una venta que referencia un producto eliminado
- Sin auditoría de la baja
- Sin posibilidad de restauración

### Opción C: Flag `activo BOOLEAN`

**Pros:** Más explícito semánticamente

**Contras:** No registra cuándo se dio de baja, no compatible con `Hibernate @Where`

## Consecuencias

**Positivas:**
- Integridad referencial preservada siempre
- Historial completo del ciclo de vida de las entidades

**Negativas / Trade-offs:**
- Todo `findAll` activo requiere `WHERE deleted_at IS NULL`
- Los índices únicos deben ser parciales
- Considerar proceso de archivado si la tabla crece demasiado

## Reglas derivadas

```java
// En el repositorio — siempre filtrar activos
List<Producto> findByDeletedAtIsNull();

// Para unicidad que ignore eliminados
CREATE UNIQUE INDEX uq_productos_nombre
    ON productos (LOWER(nombre))
    WHERE deleted_at IS NULL;
```

- Las entidades de auditoría (movimientos, logs) no tienen `deleted_at` — son inmutables
- "Dar de baja" = `UPDATE ... SET deleted_at = NOW()`
- "Restaurar" = `UPDATE ... SET deleted_at = NULL`
- Las consultas de conteo o reportes especifican si incluyen o no registros dados de baja
