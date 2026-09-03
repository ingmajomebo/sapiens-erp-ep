---
tags: [arquitectura, frontend, react]
fecha: 2026-06-21
---

# Frontend — Estructura React/TypeScript

> [!WARNING] Documento de propuesta, no de estado actual
> La estructura por `components/`, `hooks/` y `types.ts` que se describe abajo
> **no es la del código**. El ERP usa pantallas planas
> (`features/inventory/Inventory.tsx`) con las consultas dentro del propio
> componente.
>
> Para construir una pantalla, la fuente de verdad es
> [[architecture/frontend-ui-kit]] y las pantallas existentes.

## Estructura de directorios (propuesta)

```
frontend/src/
├── features/                    # Un directorio por bounded context
│   ├── catalog/
│   │   ├── components/          # Componentes UI del módulo
│   │   ├── hooks/               # Lógica con React Query
│   │   ├── api/                 # Llamadas HTTP al backend
│   │   └── types.ts             # DTOs TypeScript del módulo
│   ├── inventory/
│   ├── procurement/
│   ├── sales/
│   ├── finance/
│   └── identity/
│
├── shared/                      # Código reutilizable entre módulos
│   ├── components/              # Componentes genéricos (Button, Table, Modal)
│   ├── hooks/                   # Hooks genéricos (useDebounce, usePagination)
│   ├── utils/                   # Funciones de utilidad
│   └── types.ts                 # Tipos compartidos (PaginatedResponse, ErrorResponse)
│
├── store/                       # Estado global (Zustand)
│   ├── authStore.ts             # Usuario autenticado, token
│   └── uiStore.ts               # Estado UI global (sidebar, notificaciones)
│
├── api/                         # Configuración del cliente HTTP
│   ├── client.ts                # Instancia Axios con interceptors JWT
│   └── queryClient.ts           # Configuración React Query
│
├── router/                      # Rutas de la aplicación
│   └── index.tsx
│
└── main.tsx
```

## Estructura interna de un feature (ejemplo: catalog)

```
features/catalog/
├── components/
│   ├── ProductoList.tsx         # Lista paginada de productos
│   ├── ProductoForm.tsx         # Formulario crear/editar
│   └── ProductoCard.tsx         # Tarjeta de producto
├── hooks/
│   ├── useProductos.ts          # Query: listado paginado
│   ├── useProducto.ts           # Query: detalle por ID
│   └── useProductoMutations.ts  # Mutations: crear, actualizar, dar baja
├── api/
│   └── productosApi.ts          # fetch/axios calls
└── types.ts                     # ProductoDto, ProductoRequest, etc.
```

## Patrones clave

### React Query para estado del servidor

```typescript
// hooks/useProductos.ts
export function useProductos(page = 0) {
    return useQuery({
        queryKey: ['productos', page],
        queryFn: () => productosApi.listar(page),
    });
}

// hooks/useProductoMutations.ts
export function useCrearProducto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productosApi.crear,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
    });
}
```

### Formularios con React Hook Form + Zod

```typescript
const schema = z.object({
    nombre:       z.string().min(1).max(100),
    unidadMedida: z.enum(['KG', 'UNIDAD']),
    stockMinimo:  z.number().min(0),
});

type ProductoFormValues = z.infer<typeof schema>;
```

### Cliente HTTP con interceptor JWT

```typescript
// api/client.ts
const client = axios.create({ baseURL: '/api/v1' });

client.interceptors.request.use(config => {
    const token = authStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
```

## Reglas

- Los componentes no hacen llamadas HTTP directamente — usan hooks
- Los hooks usan React Query — no `useEffect` + `fetch` manual
- No hay lógica de negocio en componentes JSX
- TypeScript strict — sin `any` salvo justificación explícita
- Los módulos no se importan entre sí directamente — se comunican por el store o por rutas

## Ver también

- [[architecture/overview]]
- [[architecture/security]]
