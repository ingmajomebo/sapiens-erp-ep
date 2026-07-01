---
tags: [arquitectura, seguridad, jwt, autenticacion]
fecha: 2026-06-21
---

# Seguridad — Autenticación y Autorización

## Mecanismo

**JWT stateless** — sin sesiones en servidor.

## Flujo de autenticación

```
1. POST /api/v1/auth/login { email, password }
   → 200 { accessToken (15 min), refreshToken (7 días) }

2. Cada request protegido:
   → Header: Authorization: Bearer <accessToken>

3. Al expirar accessToken:
   POST /api/v1/auth/refresh { refreshToken }
   → 200 { accessToken nuevo }

4. Logout:
   POST /api/v1/auth/logout { refreshToken }
   → Invalida el refreshToken en BD
```

## Tokens

| Token | TTL | Almacenamiento cliente | Uso |
|-------|-----|----------------------|-----|
| `accessToken` | 15 min | Memory (no localStorage) | Cada request |
| `refreshToken` | 7 días | HttpOnly Cookie o Secure storage | Solo para renovar |

## Estructura del JWT payload

```json
{
  "sub": "uuid-del-usuario",
  "nombre": "Juan Pérez",
  "rol": "SUPERVISOR",
  "iat": 1718961000,
  "exp": 1718961900
}
```

## Roles y permisos

Ver tabla completa en [[modules/identity/module]].

Implementación en Spring Security:

```java
@PreAuthorize("hasRole('SUPERVISOR')")
public ResponseEntity<?> crearProducto(...) { }

@PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
public ResponseEntity<?> ajustarInventario(...) { }
```

## Configuración de seguridad (Spring Security)

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

## CORS

```java
// Configurar origins explícitamente — NUNCA allowedOrigins("*") en producción
.allowedOrigins("https://erp.sapiens.com")
.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
.allowedHeaders("Authorization", "Content-Type")
```

## Refresh tokens en BD

```sql
CREATE TABLE refresh_tokens (
    id          UUID      PRIMARY KEY,
    usuario_id  UUID      NOT NULL REFERENCES usuarios(id),
    token_hash  VARCHAR(255) NOT NULL UNIQUE,  -- hash del token, nunca el token en claro
    expires_at  TIMESTAMP NOT NULL,
    revoked_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Reglas de seguridad

- Las contraseñas se hashean con **BCrypt** (cost factor 12)
- El `refreshToken` se almacena como hash en BD — nunca en claro
- Nunca loguear tokens, contraseñas ni datos sensibles
- Los secrets (JWT secret key) van en variables de entorno, nunca en código
- Los endpoints de administración de usuarios requieren rol `ADMIN`

## Ver también

- [[modules/identity/module]]
- [[modules/identity/entities/user]]
- [[decisions/adr-003-jwt-auth]]
