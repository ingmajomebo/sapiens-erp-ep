---
tags: [api, endpoints]
fecha: 2026-06-21
---

# Catálogo de Endpoints REST

Base URL: `/api/v1`

## Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login, retorna access + refresh token |
| POST | `/auth/refresh` | Renueva el access token |
| POST | `/auth/logout` | Invalida el refresh token |

## Productos

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/productos` | Listar productos (paginado) | OPERADOR |
| GET | `/productos/{id}` | Obtener producto por ID | OPERADOR |
| POST | `/productos` | Crear producto | SUPERVISOR |
| PUT | `/productos/{id}` | Actualizar producto | SUPERVISOR |
| DELETE | `/productos/{id}` | Baja lógica (soft delete) | ADMIN |

## Lotes

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/lotes` | Listar lotes (paginado, filtrable por producto) | OPERADOR |
| GET | `/lotes/{id}` | Obtener lote | OPERADOR |
| POST | `/lotes` | Registrar nueva entrada de mercancía | SUPERVISOR |

## Movimientos de Inventario

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/movimientos` | Listar movimientos (paginado, filtrable) | OPERADOR |
| POST | `/movimientos` | Registrar movimiento manual (ajuste, merma) | SUPERVISOR |

## Proveedores

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/proveedores` | Listar proveedores | OPERADOR |
| GET | `/proveedores/{id}` | Obtener proveedor | OPERADOR |
| POST | `/proveedores` | Crear proveedor | SUPERVISOR |
| PUT | `/proveedores/{id}` | Actualizar proveedor | SUPERVISOR |
| DELETE | `/proveedores/{id}` | Baja lógica | ADMIN |

## Ventas

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/ventas` | Listar ventas (paginado) | OPERADOR |
| GET | `/ventas/{id}` | Obtener venta con ítems | OPERADOR |
| POST | `/ventas` | Registrar venta | OPERADOR |
| DELETE | `/ventas/{id}` | Anular venta | SUPERVISOR |

## Alertas

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| GET | `/alertas` | Listar alertas activas | OPERADOR |
| PATCH | `/alertas/{id}/resolver` | Marcar alerta como resuelta | SUPERVISOR |
| PATCH | `/alertas/{id}/ignorar` | Ignorar alerta | SUPERVISOR |

## Formato de respuesta paginada

```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8
}
```

## Formato de error

```json
{
  "status": 422,
  "error": "STOCK_INSUFICIENTE",
  "message": "No hay stock suficiente del producto Merluza",
  "timestamp": "2026-06-21T10:30:00Z"
}
```
