import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Al entrar a un módulo (montar su vista) siempre se re-consulta el
      // servidor: muestra la data cacheada al instante y la refresca en
      // segundo plano, para no tener que recargar la página a mano.
      refetchOnMount: 'always',
    },
  },
})
