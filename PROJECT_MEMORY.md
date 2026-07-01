# PROJECT_MEMORY.md — Sapiens ERP
> Memoria viva del proyecto. Fuentes: `docs/`, `sapiens-erp/docs/wiki/`, code.  
> Última actualización: 2026-06-29

---

## ¿Qué es este proyecto?

ERP de gestión empresarial especializado para **pescaderías**. Digitaliza y centraliza operaciones completas: compra de mercancía, control de inventario (stock, mermas, vencimientos), ventas en mostrador vía POS, gestión de caja, gastos y contabilidad básica.

**Problema que resuelve:** Elimina cuadernos y Excel para el inventario. Proporciona cálculo automático de stock, trazabilidad total de movimientos, alertas de vencimiento y stock bajo, historial para toma de decisiones.

---

## Equipo

| Persona | Rol |
|---------|-----|
| **Manuel** | Desarrollador principal (backend Java + frontend React) |
| **Iskian** | QA — valida contra el documento de requisitos |

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Java + Spring Boot | Java 17 bytecode / Java 21 runtime · Spring Boot 3.5.0 |
| Build | Gradle Wrapper | **Siempre `./gradlew`** — nunca `gradle` global |
| BD | PostgreSQL | 16 |
| Migraciones | Flyway | `classpath:db/migration` |
| ORM | Spring Data JPA + Hibernate | Dialecto PostgreSQL |
| Seguridad | Spring Security + JWT | JJWT 0.12.6 |
| Validación | Jakarta Validation | Spring Boot starter |
| Frontend | React + TypeScript | React 18 · TypeScript 5.x |
| Bundler | Vite | — |
| Estado servidor | TanStack Query | useQuery / useMutation |
| Estado global | Zustand | persist middleware → `localStorage` |
| HTTP | Axios | Interceptores JWT (auto-refresh 401) |
| Formularios | React Hook Form + Zod | — |

**Puertos locales:**

| Servicio | Puerto | URL |
|---------|--------|-----|
| Backend API | 8080 | `http://localhost:8080/api/v1/` |
| Frontend dev | 5173 | `http://localhost:5173` |
| PostgreSQL | 5432 | DB `sapiens_erp` · usuario `sapiens` |
| Health check | 8080 | `/actuator/health` |

---

## Usuarios del sistema

| Rol | Perfil | Nivel de acceso |
|-----|--------|-----------------|
| `ADMIN` | Dueño / gerente | Configuración total, usuarios, reportes |
| `SUPERVISOR` | Encargado de turno | Inventario, compras, ventas, caja |
| `OPERATOR` | Vendedor / cajero | POS, registrar ventas, consulta de stock |

---

## Módulos (Bounded Contexts)

### Estado de implementación

| Módulo | Backend | Frontend | Qué gestiona |
|--------|---------|----------|-------------|
| `identity` | ✅ Completo | ✅ Completo | Usuarios, roles, JWT auth |
| `catalog` | ✅ Completo | ✅ Completo | Productos, categorías, unidades de medida |
| `inventory` | ✅ Completo | ✅ Completo | Stock (calculado), lotes, movimientos, FIFO, mermas, alertas |
| `procurement` | ✅ Completo | ✅ Completo | Proveedores, órdenes de compra, recepción de mercancía |
| `finance` | ✅ Completo | ✅ Completo | Cuentas por pagar, caja y bancos, gastos, movimientos financieros |
| `sales` | ✅ Completo | ✅ Completo | Clientes, ventas, POS, sesiones de caja |
| `project` | ✅ Completo | ✅ Completo | Sprints, tareas, prompt planner, historias de usuario |
| `ai` | ✅ Completo | — | Integración Anthropic API |
| `reports` | 📋 Pendiente | — | Reportes transversales (solo lectura) |
| `accounting` | 📋 Pendiente | 🔜 Placeholder | Contabilidad |
| `invoicing` | 📋 Pendiente | 🔜 Placeholder | Facturación fiscal |

### Mapa de dependencias entre contextos

```
Catalog ──────▶ Inventory (CORE DOMAIN) ◀── Procurement
                      │                          │
                      ▼                          ▼
                    Sales ─────────────────▶ Finance
                      │
                      ▼
                   Reports (solo lectura, transversal)

Identity (transversal a todos via @PreAuthorize)
```

---

## Glosario de dominio (Lenguaje Ubicuo)

| Término | Definición |
|---------|-----------|
| **Producto** | Unidad mínima del catálogo (ej. Merluza, Camarón). Tiene unidad de medida (KG, UNIDAD). |
| **Unidad de Medida** | `KG` (peso, 3 decimales) o `UNIT` (conteo entero). |
| **Lote** | Partida específica de un Producto recibida en una fecha, con precio de compra y vencimiento propios. |
| **Stock** | Cantidad disponible de un Producto. **No se almacena** — se calcula sumando Movimientos. |
| **Movimiento** | Registro **inmutable** de un cambio en Stock. Tipos: `ENTRY`, `EXIT`, `WASTE`, `POSITIVE_ADJUSTMENT`, `NEGATIVE_ADJUSTMENT`. |
| **Merma** | Pérdida de producto (deterioro, rotura, vencimiento). Genera Movimiento tipo `WASTE`. Motivo obligatorio. |
| **Orden de Compra** | Solicitud formal a Proveedor. Estados: `DRAFT → CONFIRMED → RECEIVED / PARTIALLY_RECEIVED / CANCELLED`. |
| **Venta** | Transacción de salida de productos. Genera Movimiento tipo `EXIT`. Estados: `PENDING → CONFIRMED / ANULADA`. |
| **POS** | Punto de Venta — interfaz rápida en mostrador. |
| **Sesión POS** | Período de trabajo de un operador (turno). Tiene apertura/cierre con arqueo. |
| **Caja Registradora** | Control del dinero físico. Registra aperturas, cierres, ingresos, egresos. |
| **Gasto** | Egreso no relacionado con compra de mercancía (servicios, mantenimiento). |
| **Factura** | Documento fiscal que formaliza Venta o Compra. |
| **Arqueo** | Conteo físico de dinero al cierre de sesión, conciliado con sistema. |
| **Proveedor** | Empresa/persona que suministra Productos. |
| **Cliente** | Persona/empresa que compra Productos. |
| **CPP** | Costo Promedio Ponderado — método de valoración del inventario. |
| **FIFO** | First In First Out — orden de consumo de lotes (los más antiguos primero). |
| **Soft Delete** | Borrado lógico con `deleted_at` — no borrado físico. |
| **ADR** | Architecture Decision Record — documento de decisión arquitectónica. |

---

## Invariantes de negocio (No negociables)

### Inventario
1. **Stock nunca directo** — se calcula sumando `inventory_movements`. No existe `setStock()`. Ver ADR-004.
2. **Movimientos inmutables** — tabla `inventory_movements` solo `INSERT`. Nunca `UPDATE` ni `DELETE`.
3. **Stock no negativo** — validar antes de egreso → `InsufficientStockException` → HTTP 422.
4. **FIFO para lotes** — consumir el lote con `fecha_ingreso` más antigua primero.
5. **Merma requiere motivo** — campo `reason` obligatorio en `WASTE` y ajustes.
6. **Ajustes requieren SUPERVISOR+** — `POSITIVE_ADJUSTMENT` y `NEGATIVE_ADJUSTMENT` solo SUPERVISOR o ADMIN.

### Datos
7. **PKs son UUID** generados en la app — nunca `SERIAL`.
8. **Soft delete** — columna `deleted_at TIMESTAMP` en entidades de negocio.
9. **Audit fields** — toda tabla de entidad lleva `created_at`, `updated_at`, `deleted_at`.
10. **Flyway obligatorio** — todo cambio de esquema va en migración. Nunca modificar migraciones ya ejecutadas.

### Código
11. **Sin lógica en controllers** — delegar siempre al service de aplicación.
12. **`@Transactional` solo en `application/`** — nunca en controllers ni repositories.
13. **DTOs en la API** — las entidades JPA nunca salen del backend.
14. **Sin `System.out.println`** — usar SLF4J siempre.

### Negocio por módulo
15. **Unicidad de nombre de producto** — case-insensitive entre productos activos.
16. **Unidad de medida inmutable** — si el producto tiene movimientos, no se puede cambiar.
17. **OC confirmada no editable** — estado `CONFIRMED`, `PARTIALLY_RECEIVED`, `RECEIVED` o `CANCELLED` → solo lectura.
18. **Una factura por OC** — generada automáticamente al recibir mercancía.
19. **Sesión POS activa requerida** — no se puede registrar venta sin `POSSession` en estado `ABIERTA`.
20. **Factura no modificable** — se emite nota de crédito en lugar de editar.
21. **Pago no puede superar pendiente** — validación en `accounts_payable`.

---

## Arquitectura de capas (Backend)

```
modules/<modulo>/
├── api/
│   ├── <Modulo>Controller.java     ← REST endpoints · Sin lógica de negocio
│   └── dto/
│       ├── <Entity>Request.java    ← Input validado con @Valid
│       └── <Entity>Response.java   ← Output (record con factory from())
├── application/
│   └── <Modulo>Service.java        ← TODA la lógica · @Transactional aquí
└── domain/
    ├── <Entity>.java               ← Entidad JPA (extiende AuditableEntity)
    ├── <Entity>Repository.java     ← Spring Data JPA
    ├── <SomeEnum>.java
    └── exception/
        └── <Something>Exception.java
```

**Flujo de una petición autenticada:**
```
Cliente → JwtAuthenticationFilter → Controller → Service (@Transactional) → Repository → PostgreSQL
                                    (sin lógica)   (toda la lógica)
```

**Manejo de errores centralizado (`GlobalExceptionHandler`):**

| Excepción | HTTP | Código |
|-----------|------|--------|
| `MethodArgumentNotValidException` | 400 | `VALIDATION_ERROR` |
| `EntityNotFoundException` | 404 | `NOT_FOUND` |
| `InsufficientStockException` | 422 | `INSUFFICIENT_STOCK` |
| `BadCredentialsException` | 401 | `UNAUTHORIZED` |
| `AccessDeniedException` | 403 | `FORBIDDEN` |
| `IllegalArgumentException` | 409 | `CONFLICT` |
| `Exception` (genérica) | 500 | `INTERNAL_ERROR` |

---

## Arquitectura frontend

```
frontend/src/
├── features/           ← Un directorio por bounded context
│   └── <modulo>/
│       ├── <Modulo>.tsx       ← Página principal
│       └── api/               ← Llamadas HTTP (useQuery/useMutation)
├── shared/             ← Componentes y hooks reutilizables
│   ├── Drawer.tsx             ← Panel lateral con SupplierForm, ProductForm
│   └── hooks/                 ← useDebounce, useToast, usePagination, useAsync
├── store/
│   ├── useAuthStore.ts        ← Zustand: tokens + user (auth-storage)
│   └── useAppStore.ts         ← Zustand: page, theme, lang, brandColors
└── api/
    └── client.ts              ← Axios + interceptores JWT
```

**Navegación:** Basada en estado Zustand (`page` key) — **no React Router**.  
URLs de estado: `/#dashboard`, `/#inventory`, `/#purchases`, `/#sales`, etc.

**Patrón de stores:**
```typescript
// Auth store (persiste en localStorage con clave 'auth-storage')
{ accessToken, refreshToken, user: { id, name, role }, isAuthenticated }

// App store (persiste en localStorage con clave 'sapiens-erp-brand')
{ currentPage, theme, language, brandColors, companyName }
```

**Auto-refresh JWT (interceptor Axios):**
```
Request con accessToken expirado
→ Backend responde 401
→ Interceptor llama POST /api/v1/auth/refresh
→ Actualiza store + localStorage
→ Reintenta request original
→ Si refresh falla: localStorage.clear() + reload()
```

---

## Autenticación

| Token | Duración | Almacenamiento |
|-------|---------|----------------|
| Access Token | 15 minutos | Stateless (no almacenado en BD) |
| Refresh Token | 7 días | `SHA-256(token)` en tabla `refresh_tokens` |

**Claims del Access Token:**
```json
{ "sub": "uuid", "name": "Administrator", "role": "ADMIN", "iat": 1717200000, "exp": 1717200900 }
```

**Rotación de refresh token:** cada uso revoca el anterior (`revoked_at = now()`) y genera nuevo par.

**Usuario inicial (DataInitializer.java):**
- Email: `admin@sapiens.com`
- Password: `Admin1234!`
- Rol: `ADMIN`
- BCrypt cost: 12

**Configuración (`application.yml`):**
```yaml
jwt:
  secret: ${JWT_SECRET}          # Variable de entorno obligatoria
  access-expiration: 900000      # 15 minutos en ms
  refresh-expiration: 604800000  # 7 días en ms
```

---

## Modelo de datos (Tablas principales)

### Identity
```sql
users (id UUID PK, email UNIQUE, password_hash, name, role ENUM(ADMIN,SUPERVISOR,OPERATOR),
       created_at, updated_at, deleted_at)
refresh_tokens (id UUID, user_id UUID FK, token_hash VARCHAR, expires_at, revoked_at)
```

### Catalog
```sql
products (id UUID, name VARCHAR, category_id UUID FK, unit_of_measure ENUM(KG,UNIT),
          minimum_stock NUMERIC(10,3), purchase_cost_last NUMERIC(12,2),
          average_cost NUMERIC(12,2), deleted_at, created_at, updated_at)
          -- Índice parcial UNIQUE: nombre entre activos (deleted_at IS NULL)
categories (id UUID, name VARCHAR, deleted_at, created_at, updated_at)
```

### Inventory
```sql
inventory_movements (id UUID PK, product_id UUID FK,
                     type ENUM(ENTRY,EXIT,WASTE,POSITIVE_ADJUSTMENT,NEGATIVE_ADJUSTMENT),
                     quantity NUMERIC(10,3) CHECK > 0,
                     unit_price NUMERIC(12,2), previous_average_cost NUMERIC(12,2),
                     new_average_cost NUMERIC(12,2),
                     reason VARCHAR, reference_id UUID, reference_type VARCHAR(30),
                     user_id UUID, occurred_at TIMESTAMP)
                     -- SOLO INSERT, nunca UPDATE ni DELETE

movement_lots (movement_id UUID FK, lot_id UUID FK, quantity NUMERIC(10,3),
               PK(movement_id, lot_id))

lots (id UUID PK, product_id UUID FK, supplier_id UUID FK,
      purchase_order_id UUID FK, quantity NUMERIC(10,3),
      purchase_price NUMERIC(12,2), received_at DATE, expires_at DATE nullable,
      invoice_number VARCHAR, created_at)

wastes (id UUID, product_id UUID FK, lot_id UUID FK nullable, quantity NUMERIC(10,3),
        type ENUM(VENCIMIENTO,DETERIORO,ROTURA,CONTEO,OTRO),
        reason VARCHAR NOT NULL, movement_id UUID FK, user_id UUID, date TIMESTAMP)

alerts (id UUID, product_id UUID FK,
        type ENUM(STOCK_MINIMO,VENCIMIENTO_PROXIMO,LOTE_VENCIDO),
        status ENUM(ACTIVA,RESUELTA,IGNORADA), alert_date TIMESTAMP, resolved_date TIMESTAMP)
```

### Procurement
```sql
suppliers (id UUID, name VARCHAR, tax_id VARCHAR UNIQUE, phone, email, address,
           contact_name, payment_terms, notes, active BOOLEAN,
           deleted_at, created_at, updated_at)

purchase_orders (id UUID, supplier_id UUID FK,
                 status ENUM(DRAFT,CONFIRMED,PARTIALLY_RECEIVED,RECEIVED,CANCELLED),
                 number VARCHAR UNIQUE, total NUMERIC(12,2), created_at, updated_at)

purchase_order_items (id UUID, purchase_order_id UUID FK, product_id UUID FK,
                      ordered_quantity NUMERIC(10,3), received_quantity NUMERIC(10,3),
                      unit_cost NUMERIC(12,2))
```

### Sales
```sql
customers (id UUID, name VARCHAR, tax_id VARCHAR UNIQUE (activos),
           document_type ENUM(RUC,DNI,CE), phone, email, address,
           deleted_at, created_at, updated_at)

sales (id UUID, number VARCHAR UNIQUE, customer_id UUID FK nullable,
       pos_session_id UUID FK nullable,
       status ENUM(PENDING,CONFIRMED,CANCELLED),
       payment_type ENUM(CASH,CARD,TRANSFER),
       subtotal NUMERIC(12,2), tax NUMERIC(12,2), total NUMERIC(12,2),
       date TIMESTAMP, user_id UUID)

sale_items (id UUID, sale_id UUID FK, product_id UUID FK,
            quantity NUMERIC(10,3), unit_price NUMERIC(12,2), subtotal NUMERIC(12,2))

pos_sessions (id UUID, user_id UUID, cash_register_id UUID FK,
              status ENUM(OPEN,CLOSED),
              opening_amount NUMERIC(12,2), closing_amount NUMERIC(12,2) nullable,
              difference NUMERIC(12,2) nullable,
              opened_at TIMESTAMP, closed_at TIMESTAMP nullable)
```

### Finance
```sql
financial_accounts (id UUID, name VARCHAR, type ENUM(CASH,BANK),
                    balance NUMERIC(12,2), deleted_at, created_at)

financial_movements (id UUID, account_id UUID FK,
                     type ENUM(INCOME,EXPENSE,TRANSFER),
                     amount NUMERIC(12,2), description VARCHAR,
                     reference_id UUID, date TIMESTAMP)

expenses (id UUID, description VARCHAR, category VARCHAR,
          amount NUMERIC(12,2) CHECK > 0, date TIMESTAMP,
          user_id UUID, created_at, updated_at)

accounts_payable (id UUID, supplier_id UUID FK, purchase_order_id UUID FK,
                  total NUMERIC(12,2), paid NUMERIC(12,2), pending NUMERIC(12,2),
                  status ENUM(PENDING,PARTIALLY_PAID,PAID), created_at, updated_at)

payment_history (id UUID, accounts_payable_id UUID FK,
                 amount NUMERIC(12,2), payment_method VARCHAR,
                 source_account VARCHAR nullable, date TIMESTAMP, reference VARCHAR)
```

### Project
```sql
sprints (id UUID, name VARCHAR, goal TEXT, start_date DATE, end_date DATE,
         status ENUM(PLANNING,ACTIVE,COMPLETED), created_at, updated_at)

project_tasks (id UUID, sprint_id UUID FK nullable, title VARCHAR, description TEXT,
               type ENUM(FEATURE,BUG,CHORE,DOCS), status ENUM(TODO,IN_PROGRESS,DONE),
               priority ENUM(LOW,MEDIUM,HIGH,CRITICAL), assigned_to UUID FK nullable,
               created_at, updated_at)

prompt_plans (id UUID, task_id UUID FK nullable, prompt_type VARCHAR,
              content TEXT, metadata JSONB, created_at)

user_stories (id UUID, module VARCHAR, code VARCHAR UNIQUE,
              title VARCHAR, description TEXT, acceptance_criteria TEXT,
              status ENUM(DRAFT,VALIDATED,IMPLEMENTED), created_at, updated_at)
```

**Índices críticos:**
- `idx_inventory_movements_product_id` — consulta stock por producto
- `idx_lots_product_received` — consumo FIFO (product_id, received_at ASC)
- `uq_products_name_active` — unicidad nombre (parcial: `WHERE deleted_at IS NULL`)
- `uq_suppliers_tax_id_active` — unicidad RUC/NIT (parcial)
- `idx_alerts_status` — alertas activas

---

## API REST

**Base URL:** `/api/v1`  
**Paginación:** `{ content, page, size, totalElements, totalPages }`  
**Error:** `{ status, error, message, timestamp }`  
**HTTP codes:** `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | Invalida refreshToken |

### Catalog
| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| GET | `/products` | OPERATOR |
| GET | `/products/{id}` | OPERATOR |
| POST | `/products` | SUPERVISOR |
| PUT | `/products/{id}` | SUPERVISOR |
| DELETE | `/products/{id}` | ADMIN |
| GET | `/categories` | OPERATOR |
| POST | `/categories` | SUPERVISOR |

### Inventory
| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| GET | `/lots` | OPERATOR |
| GET | `/movements` | OPERATOR |
| POST | `/movements` | SUPERVISOR (AJUSTE/MERMA) |
| GET | `/alerts` | OPERATOR |
| PATCH | `/alerts/{id}/resolve` | SUPERVISOR |

### Procurement
| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| GET | `/suppliers` | OPERATOR |
| POST | `/suppliers` | SUPERVISOR |
| PUT | `/suppliers/{id}` | SUPERVISOR |
| DELETE | `/suppliers/{id}` | ADMIN |
| POST | `/purchase-orders` | SUPERVISOR |
| GET | `/purchase-orders` | SUPERVISOR |
| POST | `/purchase-orders/{id}/confirm` | SUPERVISOR |
| POST | `/purchase-orders/{id}/receive` | SUPERVISOR |
| POST | `/purchase-orders/{id}/cancel` | SUPERVISOR |

### Sales
| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| GET | `/sales` | OPERATOR |
| POST | `/sales` | OPERATOR |
| DELETE | `/sales/{id}` | SUPERVISOR (anular) |
| GET | `/customers` | OPERATOR |
| POST | `/customers` | SUPERVISOR |
| POST | `/pos/sessions` | OPERATOR |
| POST | `/pos/sessions/{id}/close` | SUPERVISOR |

### Finance
| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| GET | `/accounts-payable` | SUPERVISOR |
| POST | `/accounts-payable/{id}/pay` | SUPERVISOR |
| GET | `/accounts-payable/{id}/payments` | SUPERVISOR |
| GET | `/financial-accounts` | SUPERVISOR |
| GET | `/financial-accounts/{id}/movements` | SUPERVISOR |
| GET | `/expenses` | SUPERVISOR |
| POST | `/expenses` | OPERATOR |

---

## Flujos de integración entre módulos

### Flujo 1 — Recepción de compra → Inventario → Finance
```
Procurement                    Inventory                    Finance
    │
    │ Confirmar OC (DRAFT → CONFIRMED)
    │ Registrar recepción
    │
    ├──── MercancíaRecibida ──▶ │
    │                           │ Crea 1 Lot por ítem
    │                           │ Crea Movement ENTRY
    │                           │ Stock = SUM(movements)
    │                           │ Verifica alertas
    │
    │◀───────────────────────── │
    │
    └──────────────────────────────▶ Genera Factura PENDING
                                     (accounts_payable)
```
**Atomicidad:** Todo en una transacción. Si falla, se revierte todo.

### Flujo 2 — Venta confirmada → Inventario
```
Sales                          Inventory
    │
    │ ConsultarStock ─────────▶ │
    │◀──── stockDisponible ──── │
    │ Validar stock suficiente
    │ Confirmar venta
    │
    ├──── VentaConfirmada ────▶ │
    │                           │ FIFO: selecciona lotes más antiguos
    │                           │ Crea Movement EXIT
    │                           │ Crea movement_lots (puente)
    │                           │ Verifica alerta stock mínimo
    │
    └──── (opcional) ─────────────▶ Finance: genera factura/recibo
```

### Flujo 3 — Merma registrada (Inventory interno)
```
Supervisor registra merma { producto, cantidad, tipo, motivo }
→ Valida stock suficiente
→ Crea Movement WASTE
→ Selecciona lotes FIFO
→ Crea movement_lots
→ Verifica alerta stock mínimo
```

### Flujo 4 — Cierre sesión POS → Finance
```
Sales: Operador declara monto final → calcula diferencia → cierra sesión
→ Finance: registra Movement CIERRE + genera resumen del día
```

### Flujo 5 — Alerta de vencimiento (Cron diario 06:00 AM)
```
Inventory scheduled job
→ Busca lotes con cantidad > 0 y expires_at IS NOT NULL
→ (expires_at - hoy) <= 2 días → alerta VENCIMIENTO_PROXIMO
→ expires_at < hoy → alerta LOTE_VENCIDO (acción obligatoria)
```

**Regla de integración:** Módulos no acceden a repositorios de otros módulos directamente. La consulta de stock (Sales → Inventory) es síncrona (necesaria para validar antes de confirmar). Eventos post-confirmación son síncronos en V1; asíncronos (mensajería) en futuras versiones.

---

## Flujo completo: Compra → Pago

```
[1] Crear Proveedor         POST /suppliers
[2] Crear Producto          POST /products
[3] Crear OC                POST /purchase-orders    (estado: DRAFT)
[4] Confirmar OC            POST /purchase-orders/{id}/confirm  (CONFIRMED)
[5] Recibir mercancía       POST /purchase-orders/{id}/receive  (RECEIVED / PARTIALLY_RECEIVED)
                            → Crea Lots + Movements ENTRY
                            → Stock del producto aumenta
                            → Se genera Factura PENDING en Finance
[6] Consultar cuentas       GET  /accounts-payable
[7] Registrar pago          POST /accounts-payable/{id}/pay     (PARTIALLY_PAID / PAID)
                            → Balance de caja disminuye
[8] Historial de pagos      GET  /accounts-payable/{id}/payments
```

**Requisitos no funcionales del flujo:**
- RNF-001: Stock nunca editable directamente
- RNF-004: Consistencia transaccional en recepción (todo o nada)
- RNF-005: Atomicidad del pago (pago + descuento en cuenta = transacción única)
- RNF-006: No se puede pagar más del saldo pendiente
- RNF-008: Una factura por OC
- RNF-010: Rendimiento < 1 segundo por endpoint

---

## Decisiones de arquitectura (ADRs)

### ADR-001 — Gradle Wrapper
- **Decisión:** Usar `./gradlew` con Kotlin DSL. Versión fija en el repo.
- **Regla:** Nunca ejecutar `gradle` directamente.

### ADR-002 — Arquitectura en Capas
- **Decisión:** `api/ → application/ → domain/ ← infrastructure/` por módulo.
- **Reglas derivadas:** `@Transactional` solo en `application/`. Entidades JPA nunca salen del backend. Sin lógica en controllers.

### ADR-003 — JWT para Autenticación
- **Decisión:** JWT stateless + refresh token hasheado en BD.
- **Access:** 15 min · **Refresh:** 7 días · algoritmo HMAC-SHA.
- **Reglas:** Secret en `JWT_SECRET` (env). Hash SHA-256 del refresh en BD. Logout marca `revoked_at`.
- **Riesgo conocido:** Ventana de 15 min donde un token comprometido sigue válido.

### ADR-004 — Stock Calculado desde Movimientos
- **Decisión:** No existe `stock_actual`. Se calcula en tiempo real:
  ```sql
  stock = SUM(qty) FILTER (ENTRY, POSITIVE_ADJUSTMENT)
        - SUM(qty) FILTER (EXIT, WASTE, NEGATIVE_ADJUSTMENT)
  WHERE product_id = :id
  ```
- **Pros:** Consistencia matemática garantizada, auditoría total, sin race conditions.
- **Contras:** Consulta más costosa que un campo. Si volumen crece → vista materializada.
- **Regla crítica:** Tabla `inventory_movements` = solo `INSERT`. Sin `UPDATE` ni `DELETE`.

### ADR-005 — Soft Delete
- **Decisión:** `deleted_at TIMESTAMP` en lugar de borrado físico.
- **Excepciones:** Registros de auditoría (movimientos) son inmutables — no tienen soft delete.
- **Reglas derivadas:** Consultas activas filtran `WHERE deleted_at IS NULL`. Índices únicos son parciales.

---

## Matriz de permisos (resumida)

| Operación | OPERATOR | SUPERVISOR | ADMIN |
|-----------|----------|-----------|-------|
| Ver productos, stock, movimientos | ✅ | ✅ | ✅ |
| Crear/editar productos, categorías | ❌ | ✅ | ✅ |
| Eliminar productos | ❌ | ❌ | ✅ |
| Registrar movimientos (AJUSTE, MERMA) | ❌ | ✅ | ✅ |
| Resolver alertas | ❌ | ✅ | ✅ |
| Gestionar proveedores y OCs | ❌ | ✅ | ✅ |
| Registrar ventas | ✅ | ✅ | ✅ |
| Anular ventas | ❌ | ✅ | ✅ |
| Registrar gastos | ✅ | ✅ | ✅ |
| Ver cuentas por pagar, registrar pagos | ❌ | ✅ | ✅ |
| Ver reportes financieros | ❌ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Configuración del sistema | ❌ | ❌ | ✅ |

**Implementación Spring Security:**
```java
@PreAuthorize("hasRole('SUPERVISOR')")
@PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
```
⚠️ Algunos endpoints en Inventory, Procurement y Finance pueden carecer de `@PreAuthorize` en el código actual — verificar antes de producción.

---

## Migraciones Flyway aplicadas

| Versión | Descripción |
|---------|-------------|
| V1 | Esquema identity (users, roles) |
| V2 | Esquema catalog (products, categories) |
| V3 | Fix timestamps + unicidad email |
| V4 | Esquema inventory (lots, inventory_movements) |
| V5 | Esquema procurement (suppliers) |
| V6 | Órdenes de compra (purchase_orders, purchase_order_items) |
| V7 | Extensión product + purchase_order_items |
| V8 | Cuentas por pagar (accounts_payable) |
| V9 | Campos de costo (purchase_cost_last, average_cost, CPP) |
| V10 | Secuencia SKU + unicidad |
| V11 | Recepciones de compra + historial de pagos |
| V12 | Extensión de pagos a proveedores |
| V13 | Cuentas financieras + movimientos financieros |
| V14 | Project tracking (sprints, project_tasks, prompt_plans) |
| V15 | Historias de usuario (user_stories) |
| V16 | Configuraciones de contexto IA |
| V17 | Gastos (expenses) |
| **V18** | **Trazabilidad de prompts** ← última migración aplicada |

**Próxima migración:** `V19__...sql`

---

## Convenciones de código

### Idioma
- **Código (Java, TypeScript, SQL):** inglés — clases, métodos, columnas, enums
- **Documentación y comentarios:** español

### Java
| Tipo | Ejemplo |
|------|---------|
| Service | `ProductService` |
| Repository | `ProductRepository` |
| DTO entrada | `ProductRequest` |
| DTO salida | `ProductResponse` |
| Excepción | `InsufficientStockException` en `domain/exception/` |
| Enum | `MovementType`, `Role`, `PurchaseOrderStatus` en `domain/` |

### TypeScript / React
| Tipo | Convención |
|------|-----------|
| Componentes | PascalCase · `.tsx` |
| Hooks | prefijo `use` · `.ts` |
| API calls | en `features/<modulo>/api/<modulo>Api.ts` |
| Tipos/DTOs | sufijo `Dto`, `Request` o `Response` |

---

## Documentación del proyecto

### `docs/` — Documentación técnica del proyecto

```
docs/
├── README.md                           ← Índice de documentación
├── api-overview.md                     ← Visión general de la API REST
├── architecture.md                     ← Arquitectura, diagramas Mermaid, capas
├── coding-standards.md                 ← Convenciones de código
├── database.md                         ← Modelo de datos, tablas, relaciones
├── glossary.md                         ← Glosario de dominio
├── security.md                         ← JWT, roles, CORS, BCrypt
├── requisitos-flujo-compra-pago.md     ← Requisitos de negocio: flujo compra→pago
├── shared/
│   ├── authentication.md               ← Flujo JWT completo (login, refresh, storage)
│   ├── authorization.md                ← Matriz de permisos por rol y módulo
│   └── common-components.md            ← Componentes/hooks compartidos del frontend
└── modules/
    ├── catalog/     → overview, entities, business-rules, api, database, frontend
    ├── inventory/   → overview, entities, business-rules, api, database, frontend
    ├── procurement/ → overview, entities, business-rules, api, database, frontend
    ├── finance/     → overview, entities, business-rules, api, database, frontend
    ├── identity/    → overview, entities, api, database
    └── project/     → overview, entities, business-rules, api, database, frontend
```

### `sapiens-erp/docs/wiki/` — Vault de Obsidian

```
sapiens-erp/docs/wiki/
├── _meta/
│   ├── INDEX.md       ← Índice del wiki
│   ├── GLOSSARY.md    ← Glosario detallado del dominio
│   ├── LOG.md         ← Historial de cambios del wiki
│   └── ROADMAP.md     ← Roadmap del proyecto
├── overview/
│   ├── vision.md          ← Visión del producto
│   ├── bounded-contexts.md← Mapa de contextos
│   └── cross-cutting.md   ← Preocupaciones transversales
├── architecture/
│   ├── overview.md        ← Arquitectura general
│   ├── stack.md           ← Stack tecnológico
│   ├── capas.md           ← Arquitectura en capas
│   ├── backend-layers.md  ← Capas backend detalladas
│   ├── database.md        ← Modelo de BD
│   ├── frontend-structure.md ← Estructura frontend
│   ├── security.md        ← Seguridad
│   ├── seguridad.md       ← Seguridad (es)
│   └── integration-flows.md ← Flujos de integración
├── decisions/
│   ├── adr-001-gradle-wrapper.md
│   ├── adr-002-layered-architecture.md
│   ├── adr-003-jwt-auth.md
│   ├── adr-004-stock-from-movements.md
│   └── adr-005-soft-delete.md
├── modules/
│   ├── catalog/    inventory/    procurement/
│   │   sales/      finance/      identity/    reports/
│   └── (cada uno con module.md + entities/)
├── domain/        ← Modelos de dominio: producto, lote, movimiento, proveedor, venta, alerta
└── api/
    └── endpoints.md ← Contratos de API
```

---

## Estado de pruebas (TestSprite — 2026-06-29)

**15 tests · 86.67% de éxito**

| Test | Estado | Área |
|------|--------|------|
| TC001 Login | ✅ | Auth |
| TC002 POS sale | ✅ | Sales |
| TC003 Cash sale (incluye crear proveedor) | ✅ | Procurement + Sales |
| TC004 Inventory search/filter | ✅ | Inventory |
| TC005 Company settings | ✅ | Settings |
| TC006 Cash register workspace | ✅ | Finance |
| TC007 Language + theme **(CRUD completo proveedor)** | ✅ | Procurement + Settings |
| TC008 Product detail + lots/movements | ✅ | Inventory |
| TC009 Dark theme | ✅ | Settings |
| TC010 Change language | ✅ | Settings |
| TC011 Excel import | 🔒 | Inventory — falta fixture `.xlsx` |
| TC012 Dashboard → Inventory nav | ✅ | Dashboard |
| TC013 Add expense | ✅ | Finance |
| TC014 Delete product | ❌ | Inventory — **BUG: producto no desaparece de UI** |
| TC015 Filter sales by status | ✅ | Sales |

**TC007 verificó el CRUD completo de proveedores:** crear → editar (con el `SupplierEditModal` implementado) → eliminar → ✅ PASSED.

Reporte completo: [testsprite_tests/testsprite-mcp-test-report.md](testsprite_tests/testsprite-mcp-test-report.md)

---

## Bugs conocidos y pendientes

| # | Módulo | Descripción | Prioridad |
|---|--------|-------------|-----------|
| 1 | Inventory (frontend) | TC014: producto no desaparece de UI tras confirmar eliminación — posible fallo silencioso en API o `invalidateQueries` no ejecutándose | **Alta** |
| 2 | Inventory (frontend) | TC011: falta archivo fixture `.xlsx` para test de importación Excel (`testsprite_tests/fixtures/products_import.xlsx`) | Media |
| 3 | Seguridad | Tokens JWT en `localStorage` expuestos a XSS — pendiente migrar a cookies HttpOnly | Baja |
| 4 | Seguridad | Algunos endpoints en Inventory, Procurement y Finance pueden carecer de `@PreAuthorize` — auditar antes de producción | Media |
| 5 | Frontend nav | Navegación basada en estado Zustand — no es deep-linkable sin React Router | Baja |
| 6 | ADR-006/007 | Pendiente documentar: estrategia FIFO para consumo de lotes + precisión decimal en stock | Baja |

---

## Funcionalidades implementadas en la sesión 2026-06-29

- **Editar proveedor (SupplierEditModal):** Botón "Editar" en cada fila de la tabla de proveedores en `Purchases.tsx`. Abre un modal local con formulario completo (nombre, RUT, contacto, email, teléfono, dirección, notas). Consume `supplierApi.update()` (PUT) que ya existía en el backend. Verificado end-to-end por TestSprite TC007 ✅.

---

## Herramientas y skills

| Herramienta | Descripción |
|-------------|-------------|
| `/prompt-planner` | Skill de Claude Code — genera prompts estructurados para tareas de desarrollo (nueva función, bug fix, BD, frontend, modificación) |
| **TestSprite** | Testing frontend automático con Playwright. Config: `.testsprite/config.json`. Tests: `testsprite_tests/`. Dashboard: `http://localhost:53928/modification` |

---

## Historial del wiki (últimas entradas del LOG.md)

| Fecha | Tipo | Descripción |
|-------|------|-------------|
| 2026-06-24 | update | HU-001 validado y corregido contra código real (ProductController, GlobalExceptionHandler) |
| 2026-06-24 | ingest | Historias de usuario HU-001, HU-002, HU-003 (módulo Catalog) |
| 2026-06-24 | update | Valoración de inventario CPP (Costo Promedio Ponderado) — V9 migration |
| 2026-06-21 | decision | Convención: nombres en código en inglés, documentación en español |
| 2026-06-21 | ingest | Backend Spring Boot inicializado (Identity + Catalog implementados, V1+V2) |
| 2026-06-21 | ingest | Frontend React implementado (8 vistas mock, Zustand, React Query, Axios) |
| 2026-06-21 | refactor | Reestructuración wiki: modular por Bounded Context (DDD) |
| 2026-06-21 | init | Creación inicial del wiki |

---

## Lo que NUNCA hacer

- Editar stock directamente (sin crear movimiento de inventario)
- Modificar o eliminar movimientos de inventario existentes
- Retornar entidades JPA desde controllers (siempre DTOs)
- Poner `@Transactional` en controllers o repositories
- Usar `gradle` global (siempre `./gradlew`)
- Hardcodear URLs, puertos, contraseñas o secrets
- Usar `System.out.println` (SLF4J)
- Crear migración Flyway sin número secuencial
- Modificar una migración Flyway ya ejecutada
- Usar `any` en TypeScript sin justificación explícita
- Agregar lógica de negocio en controllers
- `allowedOrigins("*")` en producción (CORS explícito)
- Crear abstracción para un problema que ocurre una sola vez
