import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './shared/layout/Layout'
import { CheckoutLayout } from './shared/layout/CheckoutLayout'
import { HomePage } from './features/home/HomePage'
import { CatalogPage } from './features/catalog/CatalogPage'
import { CategoryPage } from './features/category/CategoryPage'
import { ShippingPage } from './features/shipping/ShippingPage'
import { ProductPage } from './features/product/ProductPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { TrackingPage } from './features/tracking/TrackingPage'

/*
 * Rutas de la tienda.
 *
 * El checkout usa un cascarón propio, sin navegación: quien llegó ahí ya
 * decidió, y cada enlace del menú es una salida de la compra.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="productos" element={<CatalogPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="envios" element={<ShippingPage />} />
        <Route path="pedido/:trackingToken" element={<TrackingPage />} />

        {/* Catálogo por categoría: /pescados y /pescados/atun.
            Van al final porque son dinámicas; React Router da prioridad a los
            segmentos fijos, así que /productos y /checkout siguen ganando. */}
        <Route path=":categoria" element={<CategoryPage />} />
        <Route path=":categoria/:especie" element={<CategoryPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* El checkout va aparte: su cascarón no lleva menú ni carrito */}
      <Route element={<CheckoutLayout />}>
        <Route path="checkout" element={<CheckoutPage />} />
      </Route>
    </Routes>
  )
}
