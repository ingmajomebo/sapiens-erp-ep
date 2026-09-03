---
tags: [arquitectura, frontend, interfaz, convenciones]
fecha: 2026-08-28
---

# Interfaz del ERP — cómo se construye una pantalla

> Fuente de verdad para el aspecto del panel administrativo. Lo que está aquí
> se sacó del código, no de un diseño previo: `frontend/src/shared/helpers.tsx`
> y las pantallas que ya existen.

Relacionado: [[architecture/frontend-structure]] (propuesta, no vigente)

---

## Antes de escribir JSX

Abre dos archivos:

1. `frontend/src/shared/helpers.tsx` — el kit de componentes
2. Una pantalla existente, por ejemplo `features/inventory/Inventory.tsx`

El sistema ya tiene su lenguaje visual. Inventar botones y tarjetas propios
produce pantallas que desentonan aunque cada una, por separado, se vea bien.

---

## El kit

| Necesito | Usar | Nunca |
|----------|------|-------|
| Contenedor | `<Card>` / `<CardHeader>` | un `div` con borde propio |
| Cifra destacada | `<KpiCard>` | maquetar la métrica a mano |
| Estado | `<StatusChip>` | una píldora con colores propios |
| Botones | `<PrimaryBtn>` / `<GhostBtn>` | `<button style={...}>` |
| Desplegable | `<Select>` / `<FilterSelect>` | `<select>` nativo |
| Tabla | `tableStyle`, `thStyle`, `tdStyle` | estilos propios |
| Paginación | `<PaginationFooter>` | paginador propio |
| Avatar | `<Tile>` | — |

`StatusChip` deriva el color del estado: `confirmed`, `paid`, `delivered` y
`ok` salen verdes; `pending`, `issued` y `low` ámbar; `overdue` y `expired`
rojos. Si tu estado no está en esa lista, pásale uno equivalente en vez de
inventar un color.

---

## El título lo pone la barra superior

`Topbar` lo lee de `titleKeys` y `subtitleKeys`. Escribirlo otra vez dentro de
la pantalla lo muestra **dos veces**, y es el error más fácil de cometer.

---

## Colores: solo tokens

```
--text  --text-2  --muted           texto
--surface  --bg  --border  --line   superficies
--accent                            acción
--pos  --warn  --neg                estados
--pos-bg  --warn-bg  --neg-bg       sus fondos
```

Un literal como `#0a7`, o un respaldo como `var(--pos, #0a7)`, rompe el modo
oscuro: el token existe y el respaldo lo pisa cuando no debería.

---

## El contenedor de página

```tsx
<div style={{
  padding: '24px 26px 40px',
  display: 'flex', flexDirection: 'column', gap: 20,
  animation: 'fadeUp 0.25s ease',
}}>
```

Estructura habitual: KPIs arriba en una rejilla de cuatro, y debajo el
contenido dentro de `<Card>`.

---

## Registrar una pantalla nueva

Son **cuatro sitios**, y olvidar uno rompe la compilación o deja el menú a
medias:

1. `store/useAppStore.ts` — añadir la clave al tipo `Page`
2. `shared/Sidebar.tsx` — la entrada del menú y su clave de traducción
3. `App.tsx` — el `case` que devuelve el componente
4. `i18n/translations.ts` — `nav_`, `pg_` y `sub_` en **es, en y pt**

---

## Datos

- Consultas con React Query, nunca `useEffect` + `fetch`
- Las llamadas HTTP viven en `features/<modulo>/api/`
- Al mutar algo que otra pantalla muestra, invalidar **por prefijo real**:
  `['sales-invoices']` NO alcanza a `['sales-invoices-search']`, porque
  TanStack compara elemento por elemento. Ver `api/invalidarVentas.ts`.
