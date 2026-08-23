## Qué cambia

<!-- Una o dos frases. Qué hace distinto el sistema después de esto. -->

## Por qué

<!-- El problema que resuelve. Si hay un contexto que no se ve en el código,
     va aquí: es lo que buscará quien revise esto dentro de seis meses. -->

## Cómo se probó

<!-- Qué comprobaste tú, más allá de que compile. -->

## Antes de fusionar

- [ ] Si toca la base de datos, la migración es **aditiva** (columnas nuevas
      nullables) — o está justificado por qué no puede serlo
- [ ] Ninguna credencial, clave ni dato de cliente entra al repositorio
      *(este repositorio es público)*
- [ ] Si cambia un `.env`, el `.example` correspondiente está actualizado
- [ ] Probado en `dev.encantopacificoerp.online` antes de proponer a `main`
