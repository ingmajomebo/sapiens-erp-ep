# Identity — API

## Endpoints

Todos los endpoints de autenticación son públicos (no requieren token).

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "admin@sapiens.com",
  "password": "Admin1234!"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "abc123urlSafeBase64...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Administrator",
  "role": "ADMIN"
}
```

**Errores:**
- `401 UNAUTHORIZED` — email no existe, password incorrecto o usuario deshabilitado

---

### POST /api/v1/auth/refresh

**Request:**
```json
{
  "refreshToken": "abc123urlSafeBase64..."
}
```

**Response 200:** mismo formato que login (con nuevos tokens)

**Errores:**
- `401 UNAUTHORIZED` — token no existe, expirado o ya revocado

---

### POST /api/v1/auth/logout

**Request:**
```json
{
  "refreshToken": "abc123urlSafeBase64..."
}
```

**Response:** `204 No Content`

**Nota:** Si el token no existe, el logout igual retorna 204 (idempotente).

## DTOs

### LoginRequest
```java
record LoginRequest(String email, String password) {}
```

### LoginResponse
```java
record LoginResponse(
    String accessToken,
    String refreshToken,
    UUID userId,
    String name,
    String role
) {}
```

### RefreshRequest
```java
record RefreshRequest(String refreshToken) {}
```
