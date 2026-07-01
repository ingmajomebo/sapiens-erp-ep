---
tags: [adr, build]
fecha: 2026-06-21
estado: Aceptado
---

# ADR-001: Gradle Wrapper en lugar de Maven o Gradle global

## Estado

Aceptado

## Contexto

Se necesita una herramienta de build para el backend Spring Boot. El equipo tiene experiencia mixta en Maven y Gradle. La reproducibilidad del build en distintos entornos (dev, CI, producción) es prioritaria.

## Decisión

Usar **Gradle Wrapper** (`./gradlew`) con configuración en **Kotlin DSL** (`build.gradle.kts`). El archivo `gradle-wrapper.jar` se versiona en el repositorio.

## Opciones consideradas

### Opción A: Gradle Wrapper ← Elegida

**Pros:**
- Versión de Gradle fijada en el repo — todos usan exactamente la misma
- Kotlin DSL: tipado estático, autocompletado, errores en tiempo de compilación
- Builds incrementales más eficientes que Maven
- Spring Initializr genera proyectos Gradle por defecto

**Contras:**
- Curva de aprendizaje para desarrolladores acostumbrados a Maven XML
- `gradle-wrapper.jar` agrega ~60 KB al repositorio

### Opción B: Maven

**Pros:** Más familiar para muchos desarrolladores Java, XML legible

**Contras:** Sin tipado en configuración, builds menos incrementales

### Opción C: Gradle global

**Pros:** Sin jar en el repo

**Contras:** Versión de Gradle depende del entorno — builds no reproducibles

## Consecuencias

**Positivas:**
- Build reproducible en cualquier entorno sin instalación previa
- Configuración type-safe con Kotlin DSL

**Negativas / Trade-offs:**
- `gradle-wrapper.jar` en el repositorio (~60 KB)

## Reglas derivadas

- Siempre ejecutar `./gradlew` desde la raíz del módulo backend
- Nunca ejecutar `gradle` directamente
- Al actualizar Gradle: ejecutar `./gradlew wrapper --gradle-version X.Y.Z`
