import type { QueryClient } from '@tanstack/react-query'

/* ============================================================================
   Refresco de las pantallas de ventas y facturación.

   POR QUÉ EXISTE ESTE ARCHIVO
   TanStack Query compara las claves ELEMENTO POR ELEMENTO, no por prefijo de
   texto. Invalidar ['sales-invoices'] NO alcanza a ['sales-invoices-search'],
   porque el primer elemento es una cadena distinta.

   El resultado era que cobrar una factura devolvía 200, la factura quedaba
   PAGADA en la base, y la fila seguía mostrando "Borrador" hasta recargar la
   página.

   Aquí se invalida por coincidencia de prefijo real sobre el nombre, así que
   una clave nueva ('sales-invoices-por-vencer', por ejemplo) queda cubierta
   sin tocar este archivo.
   ========================================================================== */

/** Familias que cambian cuando se emite, cobra o anula una factura. */
const FAMILIAS = ['sales-invoice', 'sales-order', 'accounts-receivable']

/**
 * Marca como obsoleta toda consulta de ventas, facturación y cartera.
 *
 * Se usa tras emitir, cobrar, abonar o anular: esas operaciones tocan el
 * listado, el resumen de arriba, la ficha abierta y el estado del pedido,
 * y todas deben reflejarlo a la vez.
 */
export function invalidarVentas(qc: QueryClient): void {
  void qc.invalidateQueries({
    predicate: query => {
      const primera = query.queryKey[0]
      return typeof primera === 'string' && FAMILIAS.some(f => primera.startsWith(f))
    },
  })
}
