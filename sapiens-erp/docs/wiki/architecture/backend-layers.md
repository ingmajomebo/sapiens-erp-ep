---
tags: [arquitectura, backend, capas]
fecha: 2026-06-21
---

# Backend — Arquitectura en Capas

## Estructura de paquetes por módulo

```
com.sapiens.erp.modules.<modulo>/
├── api/
│   ├── <Entidad>Controller.java
│   └── dto/
│       ├── <Entidad>Request.java
│       └── <Entidad>Response.java
├── application/
│   └── <Entidad>Service.java
├── domain/
│   ├── <Entidad>.java            ← Entidad JPA
│   ├── <Entidad>Repository.java  ← Interface Spring Data
│   └── exception/
│       └── <X>Exception.java
└── infrastructure/
    └── (adapters, config específica del módulo)
```

## Regla de dependencia

```
api/  →  application/  →  domain/
                           ↑
                    infrastructure/
```

- `domain/` no importa Spring, JPA ni nada de infraestructura
- `infrastructure/` implementa interfaces definidas en `domain/`
- `api/` solo conoce `application/`

## Responsabilidades por capa

### api/ — Capa de Presentación

```java
@RestController
@RequestMapping("/api/v1/productos")
public class ProductoController {

    @PostMapping
    @PreAuthorize("hasRole('SUPERVISOR')")
    public ResponseEntity<ProductoResponse> crear(@Valid @RequestBody ProductoRequest req) {
        return ResponseEntity.status(201).body(productoService.crear(req));
    }
}
```

**Responsabilidades:**
- Recibir request HTTP, validar con `@Valid`
- Delegar a servicio de aplicación
- Retornar DTO de respuesta con código HTTP correcto
- Autorización con `@PreAuthorize`

**Prohibido:**
- Lógica de negocio
- Acceso directo a repositorios
- Retornar entidades JPA

### application/ — Capa de Aplicación

```java
@Service
@Transactional
public class ProductoService {

    public ProductoResponse crear(ProductoRequest req) {
        validarNombreUnico(req.nombre());          // regla de negocio
        Producto producto = Producto.crear(req);  // factory en dominio
        Producto guardado = repository.save(producto);
        return ProductoResponse.from(guardado);
    }
}
```

**Responsabilidades:**
- Orquestar los casos de uso
- Coordinar entre entidades y repositorios
- Gestionar transacciones (`@Transactional`)
- Lanzar excepciones de negocio

**Prohibido:**
- HTTP (nada de `HttpServletRequest`, `ResponseEntity`)
- Llamadas directas entre servicios de distintos módulos (usar eventos)

### domain/ — Capa de Dominio

```java
@Entity
@Table(name = "products")
public class Product {

    @Id private UUID id;
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure")
    private UnitOfMeasure unitOfMeasure;

    // Solo lógica de invariantes propios
    public void validateUnitChange(boolean hasMovements) {
        if (hasMovements) {
            throw new UnitOfMeasureImmutableException(this.id);
        }
    }
}
```

**Responsabilidades:**
- Entidades JPA con sus invariantes
- Enums de dominio
- Interfaces de repositorio
- Excepciones de negocio

**Prohibido:**
- Importar Spring (salvo anotaciones JPA)
- Lógica de casos de uso
- Acceso a repositorios de otros módulos

### infrastructure/ — Capa de Infraestructura

```java
// Implementaciones de repositorio (Spring Data hace esto automáticamente)
public interface ProductoRepository extends JpaRepository<Producto, UUID> {
    Optional<Producto> findByNombreIgnoreCaseAndDeletedAtIsNull(String nombre);
    @Query("SELECT SUM(...) FROM MovimientoInventario m WHERE m.productoId = :id")
    BigDecimal calcularStock(@Param("id") UUID productoId);
}
```

**Responsabilidades:**
- Implementaciones de repositorio (Spring Data JPA)
- Configuración de beans
- Adapters hacia servicios externos

## Manejo de errores centralizado

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<ErrorResponse> handleStockInsuficiente(StockInsuficienteException ex) {
        return ResponseEntity.status(422)
            .body(new ErrorResponse(422, "STOCK_INSUFICIENTE", ex.getMessage()));
    }
}
```

Todas las excepciones de negocio se mapean aquí — nunca en los controllers.

## Ver también

- [[architecture/overview]]
- [[decisions/adr-002-layered-architecture]]
- [[overview/cross-cutting]]
