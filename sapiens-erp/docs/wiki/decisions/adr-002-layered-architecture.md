---
tags: [adr, arquitectura, backend]
fecha: 2026-06-21
estado: Aceptado
---

# ADR-002: Arquitectura en Capas para el Backend

## Estado

Aceptado

## Contexto

El backend necesita una estructura que permita crecer con múltiples módulos (7 bounded contexts), mantener las reglas de negocio aisladas de la infraestructura, y que sea familiar para el equipo.

## Decisión

Implementar **arquitectura en capas** por módulo: `api/ → application/ → domain/ ← infrastructure/`. Los módulos no se llaman entre sí directamente — se coordinan por eventos de dominio.

## Opciones consideradas

### Opción A: Capas por módulo ← Elegida

**Pros:**
- Familiar para equipos Spring Boot
- Clara separación de responsabilidades
- Fácil de testear capa por capa
- Bajo acoplamiento entre capas

**Contras:**
- Más archivos que una arquitectura plana
- Requiere disciplina para no saltarse capas

### Opción B: Arquitectura hexagonal (Ports & Adapters)

**Pros:** Mayor pureza del dominio, más testeable

**Contras:** Mayor complejidad inicial, curva de aprendizaje, overkill para el tamaño actual del proyecto

### Opción C: Estructura plana (todo en un package)

**Pros:** Simple al inicio

**Contras:** No escala, mezcla responsabilidades, imposible de mantener con 7 módulos

## Consecuencias

**Positivas:**
- Dominio libre de dependencias de Spring/JPA
- Servicios fácilmente testeables con Mockito
- Estructura predecible para cualquier contribuidor

**Negativas / Trade-offs:**
- Un CRUD simple requiere Controller + Service + Repository + 2 DTOs (más archivos)

## Reglas derivadas

- `@Transactional` solo en `application/`
- Nunca importar un repositorio en `api/`
- Nunca retornar entidades JPA desde controllers
- Nunca lógica de negocio en controllers

_Ver detalle: [[architecture/backend-layers]]_
