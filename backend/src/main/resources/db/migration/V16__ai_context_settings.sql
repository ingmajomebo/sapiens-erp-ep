CREATE TABLE ai_context_settings (
    id          UUID PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    content     TEXT         NOT NULL,
    label       VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO ai_context_settings (id, setting_key, label, content)
VALUES (
    gen_random_uuid(),
    'system_context',
    'Contexto base del Asistente IA',
    '# Contexto del Proyecto Sapiens ERP

## Qué es este proyecto
ERP de gestión de inventario para una **pescadería**. Digitaliza compras, ventas, inventario, caja y reportes.

## Stack tecnológico
- Backend: Java 21 + Spring Boot 3.x · Build: ./gradlew (NUNCA gradle global)
- Frontend: React 18 + TypeScript + Vite + TanStack Query (useQuery, useMutation)
- BD: PostgreSQL 16 · Migraciones: Flyway (V1–V16, próxima V17)
- Auth: JWT stateless · Roles: ADMIN > SUPERVISOR > OPERADOR · BCrypt cost 12

## Arquitectura por módulo (DDD)
```
modules/<modulo>/
  api/           → Controllers + DTOs (Request/Response)
  application/   → Services (@Transactional SOLO aquí)
  domain/        → Entidades JPA + Enums + Repositorios + Excepciones
  infrastructure/→ Configuraciones específicas
```

## Módulos existentes
- **catalog**: Productos, categorías, unidades de medida
- **inventory**: Stock, movimientos, lotes, mermas (Core Domain)
- **procurement**: Proveedores, órdenes de compra, recepciones, pagos
- **finance**: Caja, gastos, cuentas financieras, cuentas por pagar
- **identity**: Usuarios, roles, JWT
- **project**: Sprints, tareas, historias de usuario, prompts, configuración IA

## Invariantes CRÍTICOS (nunca violar)
1. Stock NUNCA se edita directo → solo via movimientos_inventario (INSERT)
2. Movimientos de inventario son INMUTABLES (solo INSERT, nunca UPDATE/DELETE)
3. Stock no negativo → StockInsuficienteException → HTTP 422
4. FIFO para lotes → consumir lote con fecha_ingreso más antigua
5. Merma requiere motivo obligatorio
6. PKs son UUID generados en app (UUID.randomUUID())
7. Soft delete → columna deleted_at TIMESTAMPTZ en todas las entidades
8. Toda entidad lleva created_at, updated_at, deleted_at (AuditableEntity)
9. Migraciones Flyway obligatorias → nunca modificar las existentes
10. Sin lógica en controllers → delegar al servicio de aplicación
11. @Transactional SOLO en application/ → nunca en controllers ni repositorios
12. DTOs en la API → entidades JPA NUNCA salen del backend
13. Sin System.out.println → usar SLF4J
14. Sin `any` en TypeScript sin justificación

## Convenciones de código
- Identificadores en INGLÉS (clases, campos, tablas, columnas, enums)
- Documentación y comentarios en español
- Servicios: sufijo `Service` | Repositorios: sufijo `Repository`
- DTO entrada: sufijo `Request` | DTO salida: sufijo `Response`
- Excepciones: sufijo `Exception` en domain/exception/
- Componentes React: PascalCase .tsx | Hooks: prefijo `use` .ts
- API calls frontend: en features/<modulo>/api/
- HTTP client frontend: import client from "../../../api/client" (NO axios directo)
- Zustand navigation: useAppStore.setPage()

## API REST
- Base: /api/v1/
- Colecciones: plural sustantivo (/productos, /lotes)
- Paginación: { content, page, size, totalElements }
- Error: { status, error, message, timestamp }
- Códigos: 200, 201, 204, 400, 401, 403, 404, 409, 422

## Seguridad
- JWT stateless: access token 15 min, refresh token 7 días
- Variables de entorno para secrets → NUNCA en código
- CORS explícito → nunca allowedOrigins("*") en producción
'
);
