---
tags: [modulo, identity, seguridad]
fecha: 2026-06-21
---

# Módulo: Identity (Identidad)

## Responsabilidad

Gestiona autenticación y autorización. Es transversal a todos los módulos — cada operación que requiere control de acceso consulta este módulo.

## Aggregate Roots

- **Usuario** — [[modules/identity/entities/user]]

## Roles del sistema

| Rol | Descripción | Nivel |
|-----|-------------|-------|
| `ADMIN` | Acceso total, incluye gestión de usuarios y configuración | 3 |
| `SUPERVISOR` | Operaciones de negocio completas, sin gestión de usuarios | 2 |
| `OPERADOR` | Operaciones de mostrador (POS, ventas, consultas) | 1 |

## Mecanismo de autenticación

JWT stateless. Ver [[architecture/security]] para detalle completo.

## Reglas de negocio

1. Un usuario solo puede tener un rol activo
2. Solo `ADMIN` puede crear, modificar o deshabilitar usuarios
3. Un usuario no puede deshabilitarse a sí mismo
4. Las contraseñas se almacenan hasheadas con BCrypt (cost factor 12)
5. El token de refresh se invalida en logout

## Permisos por módulo

| Operación | OPERADOR | SUPERVISOR | ADMIN |
|-----------|----------|-----------|-------|
| Consultar stock | ✅ | ✅ | ✅ |
| Registrar venta | ✅ | ✅ | ✅ |
| Registrar merma | ✅ | ✅ | ✅ |
| Ajuste de inventario | ❌ | ✅ | ✅ |
| Crear/editar productos | ❌ | ✅ | ✅ |
| Crear órdenes de compra | ❌ | ✅ | ✅ |
| Ver reportes financieros | ❌ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Configuración del sistema | ❌ | ❌ | ✅ |

## Paquete Java

`com.sapiens.erp.modules.identity`

## Endpoints

`/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/usuarios`

## Ver también

- [[modules/identity/entities/user]]
- [[architecture/security]]
