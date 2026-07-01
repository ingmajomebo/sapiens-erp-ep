---
tags: [overview, reglas, invariantes]
fecha: 2026-06-21
---

# Reglas Transversales

> Estas reglas aplican a **todos los módulos**. Son invariantes del sistema — no se negocian.

---

## Invariantes de datos

### ID-001 — Claves primarias UUID
Todas las entidades usan UUID generado en la aplicación. Nunca `SERIAL` ni `AUTO_INCREMENT`.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- generado en la app, no en la BD
```

### ID-002 — Soft delete
Las entidades de negocio nunca se eliminan físicamente. Se marcan con `deleted_at TIMESTAMP`.
Excepción: registros de auditoría y logs — estos son inmutables y nunca se borran.
Ver [[decisions/adr-005-soft-delete]].

### ID-003 — Timestamps de auditoría
Toda tabla de entidad de negocio lleva:
```sql
created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at  TIMESTAMP
```

### ID-004 — Trazabilidad de usuario
Todo movimiento de dato significativo registra el `usuario_id` que lo originó.

---

## Invariantes de API

### API-001 — Versión en URL
Todos los endpoints viven bajo `/api/v1/`. Cambios incompatibles requieren nueva versión (`/api/v2/`).

### API-002 — Formato de error estándar
```json
{
  "status": 422,
  "error": "STOCK_INSUFICIENTE",
  "message": "No hay stock suficiente del producto Merluza (disponible: 2.5 kg, solicitado: 5 kg)",
  "timestamp": "2026-06-21T10:30:00Z"
}
```

### API-003 — Paginación estándar
Toda colección potencialmente grande retorna:
```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8
}
```

### API-004 — Entidades JPA nunca en responses
Los controllers siempre retornan DTOs de respuesta, nunca entidades JPA directamente.

---

## Invariantes de seguridad

### SEC-001 — Autenticación requerida
Todos los endpoints (salvo `/api/v1/auth/**` y actuator health) requieren JWT válido.

### SEC-002 — Secrets en variables de entorno
Contraseñas, secrets JWT, credenciales de BD — nunca en código fuente ni en el repositorio.

### SEC-003 — Sin logging de datos sensibles
No loguear: contraseñas, tokens, datos de tarjeta, datos personales sensibles.

---

## Invariantes de negocio

### BIZ-001 — Stock calculado
El stock de un producto **nunca se edita directamente**. Siempre se calcula sumando sus Movimientos.
Ver [[decisions/adr-004-stock-from-movements]] y [[modules/inventory/business-rules]].

### BIZ-002 — Movimientos inmutables
Los Movimientos de Inventario son registros de auditoría. Una vez creados, no se modifican ni eliminan. Los errores se corrigen con movimientos de compensación.

### BIZ-003 — Stock no negativo
Ninguna operación puede dejar el stock de un producto en negativo. El sistema rechaza la operación con error `STOCK_INSUFICIENTE`.

### BIZ-004 — Decimal para productos con peso
Los productos con `unidad_medida = KG` soportan hasta 3 decimales (gramos). El sistema no redondea stock intermedio.

### BIZ-005 — FIFO para lotes
Al descontar stock, se consumen primero los lotes más antiguos (por `fecha_ingreso`). Entre lotes del mismo día, el de menor `id` primero.

---

## Invariantes de código

### CODE-001 — Sin lógica en controllers
Los controllers reciben la request, delegan al servicio, retornan la response. Nada más.

### CODE-002 — Transacciones en servicios
`@Transactional` solo en la capa `application/`. Nunca en controllers, nunca en repositorios.

### CODE-003 — Sin System.out.println
Todo logging usa SLF4J (`LoggerFactory.getLogger()`). Nunca `System.out.println`.

### CODE-004 — Migraciones Flyway obligatorias
Cualquier cambio de esquema de BD requiere un archivo de migración `V{n}__{descripcion}.sql`. Nunca modificar migraciones ya ejecutadas.
