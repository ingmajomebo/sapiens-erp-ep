# Autorización — Documentación Compartida

## Roles

```java
public enum Role { ADMIN, SUPERVISOR, OPERATOR }
```

Jerarquía de privilegios: `ADMIN > SUPERVISOR > OPERATOR`

---

## Mecanismo

Spring Security con `@EnableMethodSecurity`. La autorización se aplica a nivel de método con `@PreAuthorize` en cada método del controller.

**No se usa** autorización a nivel de ruta en `SecurityConfig` (solo se define que todo endpoint requiere autenticación, excepto `/api/v1/auth/**` y `/actuator/health`).

---

## Matriz de permisos por módulo

### Identity

| Endpoint | OPERATOR | SUPERVISOR | ADMIN |
|---------|----------|-----------|-------|
| POST /auth/login | Público | Público | Público |
| POST /auth/refresh | Público | Público | Público |
| POST /auth/logout | Público | Público | Público |

### Catalog

| Operación | OPERATOR | SUPERVISOR | ADMIN |
|-----------|----------|-----------|-------|
| GET /products | ✓ | ✓ | ✓ |
| GET /products/{id} | ✓ | ✓ | ✓ |
| POST /products | ✗ | ✓ | ✓ |
| PUT /products/{id} | ✗ | ✓ | ✓ |
| DELETE /products/{id} | ✗ | ✓ | ✓ |
| POST /products/bulk | ✗ | ✓ | ✓ |
| GET /categories | ✓ | ✓ | ✓ |
| POST /categories | ✗ | ✓ | ✓ |
| DELETE /categories/{id} | ✗ | ✓ | ✓ |

### Inventory, Procurement, Finance, Project

| Módulo | OPERATOR | SUPERVISOR | ADMIN |
|--------|----------|-----------|-------|
| Inventory (todos los endpoints) | ✓ | ✓ | ✓ |
| Procurement (todos los endpoints) | ✓ | ✓ | ✓ |
| Finance (todos los endpoints) | ✓ | ✓ | ✓ |
| Project (todos los endpoints) | ✓ | ✓ | ✓ |

**Nota**: Los módulos Inventory, Procurement, Finance y Project no tienen `@PreAuthorize` de restricción de rol en el código actual. Cualquier usuario autenticado puede ejecutar cualquier operación en estos módulos.

---

## Implementación Spring Security

```java
// SecurityConfig.java
http
    .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/v1/auth/**").permitAll()
        .requestMatchers("/actuator/health").permitAll()
        .anyRequest().authenticated()
    )
    .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
```

El `JwtAuthFilter` extrae el token del header `Authorization: Bearer <token>`, lo valida con `JwtService`, y carga el `SecurityContext` con el usuario y su rol.

---

## Extracción de claims en filtro JWT

```java
// JwtAuthFilter.java (inferido)
String userId = claims.getSubject();
String role   = claims.get("role", String.class);
// El rol se convierte en GrantedAuthority: "ROLE_ADMIN"
```

Spring Security prefija automáticamente los roles con `ROLE_`, por lo que `@PreAuthorize("hasRole('ADMIN')")` matchea con el claim `"ADMIN"`.

---

## Observaciones del Arquitecto

### OBS-AUTH-01: Inventory y Finance sin control de rol
Los módulos de Inventario, Compras, Finanzas y Proyecto no tienen `@PreAuthorize` en sus controllers. Cualquier `OPERATOR` puede crear, modificar o eliminar órdenes de compra, registrar pagos, etc. Se recomienda agregar restricciones según el negocio.

### OBS-AUTH-02: Sin refresh de permisos en tokens activos
Si el rol de un usuario cambia (de OPERATOR a ADMIN), el access token existente seguirá teniendo el rol anterior hasta que expire (máximo 15 minutos). Dado que el access token es stateless, no hay mecanismo de invalidación inmediata de roles.
