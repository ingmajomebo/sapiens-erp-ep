import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './shared/layout/Layout'
import { HomePage } from './features/home/HomePage'
import { CatalogPage } from './features/catalog/CatalogPage'
import { ProductPage } from './features/product/ProductPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { TrackingPage } from './features/tracking/TrackingPage'

/*
 * Rutas de la tienda. Las vistas de catálogo, producto, checkout y
 * seguimiento se construyen en los pasos 4 y 5; hasta entonces redirigen
 * al home en vez de dejar rutas muertas.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="productos" element={<CatalogPage />} />
        <Route path="productos/:slug" element={<ProductPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="pedido/:trackingToken" element={<TrackingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
