---
tags: [arquitectura, seguridad, autenticacion]
fecha: 2026-06-21
---

# Seguridad y Autenticación

## Mecanismo

Autenticación stateless con **JWT**:

1. Cliente envía `POST /api/v1/auth/login` con credenciales
2. Backend devuelve `accessToken` (corta vida, ej. 15 min) y `refreshToken` (larga vida, ej. 7 días)
3. Cada request protegido lleva `Authorization: Bearer <accessToken>`
4. Al expirar el access token, el cliente usa `POST /api/v1/auth/refresh`

## Roles

| Rol | Permisos |
|-----|----------|
| `ADMIN` | Acceso total: usuarios, configuración, reportes |
| `SUPERVISOR` | Inventario, ventas, proveedores, alertas |
| `OPERADOR` | Registro de movimientos y ventas básicas |

## Reglas

- CORS configurado explícitamente; nunca `allowedOrigins("*")` en producción
- Contraseñas hasheadas con **BCrypt**
- Nunca loguear tokens ni contraseñas
- Los endpoints de salud (`/actuator/health`) son públicos; todo lo demás requiere autenticación

## Endpoints de auth

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Obtener tokens |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Invalidar refresh token |

## Ver también

- [[capas]]
- [[api/endpoints]]
