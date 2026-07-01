---
tags: [arquitectura, backend]
fecha: 2026-06-21
---

# Arquitectura en Capas — Backend

## Estructura

```
api/           ← Controllers REST (entrada HTTP, DTOs)
application/   ← Servicios / casos de uso
domain/        ← Entidades, Value Objects, reglas de negocio
infrastructure/← Repositorios JPA, configs, adaptadores
```

## Regla de dependencia

Las capas internas no conocen las externas:

```
api → application → domain
infrastructure → domain
```

`domain` no importa nada de Spring, JPA ni infraestructura.

## Responsabilidades por capa

### `api/`
- Recibe requests HTTP
- Convierte DTOs de entrada en llamadas a servicios
- Convierte resultados de servicios en DTOs de salida
- Maneja autenticación/autorización a nivel de endpoint
- **No contiene lógica de negocio**

### `application/`
- Orquesta los casos de uso
- Contiene `@Transactional`
- Llama a repositorios y entidades de dominio
- Lanza excepciones de negocio

### `domain/`
- Entidades JPA con sus invariantes
- Enums de dominio
- Excepciones de negocio (`StockInsuficienteException`, etc.)
- Value Objects si aplica
- **Sin dependencias de frameworks**

### `infrastructure/`
- Interfaces `Repository` de Spring Data
- Configuración de Flyway, Security, CORS
- Beans de configuración general

## Manejo de errores

`@ControllerAdvice` en `api/` captura todas las excepciones y retorna respuestas consistentes:

```json
{ "status": 422, "error": "STOCK_INSUFICIENTE", "message": "...", "timestamp": "..." }
```

## Ver también

- [[stack]]
- [[seguridad]]
