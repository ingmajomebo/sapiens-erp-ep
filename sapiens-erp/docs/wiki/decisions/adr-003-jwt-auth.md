---
tags: [adr, seguridad, autenticacion]
fecha: 2026-06-21
estado: Aceptado
---

# ADR-003: JWT para Autenticación (Stateless)

## Estado

Aceptado

## Contexto

El sistema tiene un frontend SPA (React) que necesita autenticarse con un backend REST. Se necesita una solución que soporte múltiples clientes (web, futuro mobile), no requiera sesiones en servidor, y sea estándar en el ecosistema Spring Boot.

## Decisión

Usar **JWT stateless** con access token de 15 minutos y refresh token de 7 días. El refresh token se almacena en BD (hasheado) para poder revocarlo en logout.

## Opciones consideradas

### Opción A: JWT stateless con refresh token en BD ← Elegida

**Pros:**
- Sin estado en servidor (escala horizontalmente)
- Logout real posible (revocar refresh token en BD)
- Estándar ampliamente adoptado
- Biblioteca `jjwt` madura para Spring Boot

**Contras:**
- Requiere tabla de refresh tokens en BD
- El access token no puede revocarse antes de que expire (15 min ventana)

### Opción B: Sesiones en servidor (Spring Session)

**Pros:** Revocación inmediata, familiar

**Contras:** Estado en servidor, no escala sin sticky sessions o Redis, acoplamiento al servidor

### Opción C: JWT puro sin refresh (solo access token largo)

**Pros:** Más simple

**Contras:** No hay logout real, token de larga vida es más riesgoso si se compromete

## Consecuencias

**Positivas:**
- Arquitectura stateless — puede escalar a múltiples instancias sin configuración adicional
- Logout funcional
- Compatible con futuros clientes mobile

**Negativas / Trade-offs:**
- Ventana de 15 min donde un access token comprometido sigue siendo válido
- Una tabla adicional en BD para refresh tokens

## Reglas derivadas

- TTL access token: 15 minutos (configurable por variable de entorno)
- TTL refresh token: 7 días (configurable)
- El JWT secret key va en variable de entorno `JWT_SECRET` — nunca en código
- El refresh token se almacena como hash (SHA-256) en BD
- En logout, se marca `revoked_at` del refresh token

_Ver detalle: [[architecture/security]]_
