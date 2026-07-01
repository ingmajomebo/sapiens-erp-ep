# Componentes Compartidos — Frontend

## Arquitectura de shared

```
frontend/src/
├── shared/
│   ├── components/    ← Componentes UI reutilizables
│   ├── hooks/         ← Hooks personalizados
│   └── types.ts       ← Tipos TypeScript transversales
├── api/
│   └── client.ts      ← Instancia Axios configurada
└── store/
    ├── useAuthStore.ts ← Estado de autenticación (Zustand)
    └── useAppStore.ts  ← Estado de UI global (Zustand)
```

---

## Cliente HTTP: `client.ts`

Archivo: `frontend/src/api/client.ts`

```typescript
const client = axios.create({
  baseURL: '/api/v1',
});

// Request interceptor: adjunta accessToken
client.interceptors.request.use((config) => {
  const token = getAccessToken(); // Lee de localStorage 'auth-storage'
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: maneja 401 con auto-refresh
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const newTokens = await refreshTokens(); // POST /auth/refresh
        updateTokensInStore(newTokens);
        error.config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return client(error.config); // Reintento único
      } catch {
        clearAuthAndReload(); // localStorage.clear() + window.location.reload()
      }
    }
    return Promise.reject(error);
  }
);
```

**Punto único de fallo**: todos los módulos usan esta instancia. Si se cambia la baseURL o la lógica de auth, afecta a toda la aplicación.

---

## Auth Store: `useAuthStore.ts`

Archivo: `frontend/src/store/useAuthStore.ts`

Zustand store con persistencia en `localStorage` bajo la clave `auth-storage`.

```typescript
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    name: string;
    role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';
  } | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
}
```

El hook `useAuthStore()` se usa en:
- Guardias de ruta para proteger páginas
- El header de la app para mostrar nombre y rol del usuario
- `client.ts` para leer el access token en requests

---

## App Store: `useAppStore.ts`

Archivo: `frontend/src/store/useAppStore.ts`

Zustand store con persistencia en `localStorage` bajo la clave `sapiens-erp-brand`.

```typescript
interface AppState {
  currentPage: string;
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  drawerType: 'permanent' | 'temporary';
  brandColors: {
    primary: string;
    secondary: string;
  };
  companyName: string;
}
```

Permite configuración visual por instalación (nombre de empresa, colores).

---

## Tipos compartidos: `shared/types.ts`

Tipos TypeScript usados por múltiples módulos:

```typescript
// Respuesta paginada estándar
interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Respuesta de error estándar
interface ApiError {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}

// Enums compartidos
type PurchaseOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'CANCELLED';
  // OBSERVACIÓN: falta 'PARTIALLY_RECEIVED' — ver OBS-PROC-FE-01
```

---

## Hooks compartidos

### `useDebounce`
Retrasa la actualización de un valor (usado en búsquedas en tiempo real).

```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
```

### `useToast` / Notificaciones
Sistema de notificaciones toast para feedback de operaciones exitosas y errores. Integrado con la respuesta de los mutations de TanStack Query.

---

## Convenciones de componentes UI

| Categoría | Librería / Patrón |
|-----------|------------------|
| Componentes base | Posiblemente MUI o componentes custom (no confirmado) |
| Tablas | Tabla HTML nativa o librería de data grid |
| Formularios | Controlados con `useState` — sin React Hook Form |
| Modales | Componente `Modal` propio con `isOpen` + `onClose` |
| Paginación | Componente propio que emite `{ page, size }` |

---

## Observaciones del Arquitecto

### OBS-SHARED-01: Sin librería de formularios
Los formularios usan estado local `useState` directamente. Para formularios complejos como la creación de OC con líneas dinámicas, esto puede resultar en código verbose. Se recomienda evaluar React Hook Form.

### OBS-SHARED-02: `localStorage` para tokens
Los tokens JWT se guardan en `localStorage`. Si bien es conveniente, es vulnerable a XSS. Para mayor seguridad se recomienda migrar a cookies HttpOnly.

### OBS-SHARED-03: `Page<T>` puede no coincidir con backend
El backend puede retornar el formato `{ content, page, size, totalElements }` de Spring Pageable, pero algunas respuestas del backend pueden ser listas simples (no paginadas). Verificar que los componentes manejen ambos formatos.
