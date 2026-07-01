# TestSprite MCP — Reporte de Pruebas Frontend
**Proyecto:** sapiens-erp-ep  
**Fecha:** 2026-06-29  
**URL:** http://localhost:5173  
**Credenciales usadas:** admin@sapiens.com / Admin1234!

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total de tests | 15 |
| ✅ Pasaron | 13 |
| ❌ Fallaron | 1 |
| 🔒 Bloqueados | 1 |
| **Tasa de éxito** | **86.67%** |

---

## Resultados por Test

### ✅ TC001 — Log in and open the authenticated shell
- **Estado:** PASSED
- **Flujo probado:** Login con admin@sapiens.com / Admin1234! → verificar shell autenticado (nav Dashboard, Purchases, tabla de compras recientes)
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/5bc14624-0f29-4610-a263-ab2356015f43

---

### ✅ TC002 — Process a sale in POS
- **Estado:** PASSED
- **Flujo probado:** Login → Sales → "+ New sale" → llenar producto/cantidad/precio → Save → verificar estado "Confirmed"
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/03993420-aef6-4e27-ad72-043857f5a1f9

---

### ✅ TC003 — Process a cash sale (incluye flujo de creación de proveedor)
- **Estado:** PASSED
- **Flujo probado:** Login → Purchases → Suppliers → crear "Proveedor Test" → Cash Register → Sales → "+ New sale" → completar venta
- **Nota:** El AI de TestSprite integró la creación de proveedor como precondición de este test tras la instrucción de flujo CRUD.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/54808013-3039-4a1f-b047-97d52848a96b

---

### ✅ TC004 — Search and filter inventory products
- **Estado:** PASSED
- **Flujo probado:** Login → Inventory → buscar "Tilapia" → filtrar por categoría y estado "Critical" → verificar resultados
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/d5ddf248-0010-4548-ad5f-48aad7cb035d

---

### ✅ TC005 — Save company settings and branding
- **Estado:** PASSED
- **Flujo probado:** Login → Settings → Brand identity → cambiar nombre empresa → guardar → Colors → verificar colores de marca
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/924927e6-5945-4db6-85df-313128c9ee8a

---

### ✅ TC006 — View the cash register workspace
- **Estado:** PASSED
- **Flujo probado:** Login → Cash Register → verificar workspace TPV (botón "Close register", tabla de transacciones, botones "Registrar pago")
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/202cef46-005f-4b64-addc-55804c88e2ff

---

### ✅ TC007 — Change language and theme (incluye CRUD completo de proveedores)
- **Estado:** PASSED
- **Flujo CRUD de proveedores ejecutado dentro de este test:**
  1. Purchases → Suppliers → crear "Proveedor Test" (nombre, RUT, contacto, email, teléfono) → Save ✅
  2. Clic en botón **"Editar"** en la fila de "Proveedor Test" ✅ *(funcionalidad implementada en esta sesión)*
  3. Editar nombre → "Proveedor Test Editado", teléfono → "+57 300 999 8888" → Save ✅
  4. Clic en botón **"Eliminar"** en la fila de "Proveedor Test Editado" → confirmar ✅
  5. Settings → cambiar idioma a ES → Toggle theme → Guardar cambios ✅
- **Hallazgo clave:** El botón "Editar" implementado en `Purchases.tsx` (modal `SupplierEditModal`) fue verificado por el agente y funcionó correctamente de extremo a extremo.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/981c3532-d38e-4188-9cc6-fa86cf03fc75

---

### ✅ TC008 — Open product details and inspect lots and movements
- **Estado:** PASSED
- **Flujo probado:** Login → Inventory → "Atun Fresco" → tab "Lotes / Precios" → tab "Movimientos" → verificar registros
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/455270a0-2813-489a-96e3-8e00722e199c

---

### ✅ TC009 — Switch the app to dark theme
- **Estado:** PASSED
- **Flujo probado:** Login → Settings → "Toggle theme" → verificar cambio de apariencia
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/88105df9-ab7b-44f5-9f20-6ecc0adcc412

---

### ✅ TC010 — Change the interface language
- **Estado:** PASSED
- **Flujo probado:** Login → clic "es" → clic "en" → verificar labels en inglés (Dashboard, Purchases)
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/95c3d053-1126-43a0-9b78-f29f983cbb14

---

### 🔒 TC011 — Import products from an Excel file
- **Estado:** BLOCKED
- **Causa:** No existe el archivo de fixture `tests/fixtures/products_import.xlsx` en el entorno de test.
- **Observación del agente:** El modal "Importar productos desde Excel" abrió correctamente. El input de archivo es accesible pero no hay un `.xlsx` disponible para subir.
- **Para desbloquear:** Crear `testsprite_tests/fixtures/products_import.xlsx` con columnas de producto válidas.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/e20337d6-1ea8-46f8-8c52-697db2ddb68c

---

### ✅ TC012 — Review dashboard summary and open inventory from top products
- **Estado:** PASSED
- **Flujo probado:** Login → Dashboard → "View all" en Top products → verificar vista de Inventory con productos (Atun Fresco, Mojarra, Pargo Rojo)
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/ecc487ba-2d23-4499-92e7-ae99e3e2ee81

---

### ✅ TC013 — Add a new expense
- **Estado:** PASSED
- **Flujo probado:** Login → Expenses → "+ Registrar gasto" → monto 25000 → descripción "Gasto de prueba automatizado 2" → Registrar
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/0b222940-d57f-4b37-b173-ab51e99f222a

---

### ❌ TC014 — Delete a product from inventory
- **Estado:** FAILED
- **Error reportado:** El producto no fue removido de Inventory después de confirmar la eliminación.
- **Observaciones del agente:**
  - El producto "Atun Fresco - Test" (SKU PRO-000028) sigue visible en la lista después de confirmar el diálogo de eliminación.
  - El agente hizo clic en "Eliminar" en el drawer de detalles y luego confirmó en el diálogo de confirmación.
- **Análisis / Bug probable:**
  - El `invalidateQueries({ queryKey: ['products'] })` después de `deleteProduct` puede no estar ejecutándose, o el endpoint de soft-delete no está respondiendo 204.
  - Alternativa: el producto tiene movimientos de inventario activos y el backend rechaza silenciosamente la eliminación (debería retornar 409 en ese caso).
  - **Acción recomendada:** Verificar el handler de delete en el frontend y el endpoint `DELETE /api/v1/products/{id}` en el backend.
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/aa51e2c4-1ff2-496f-b32f-b38fc446c1e6

---

### ✅ TC015 — Filter sales orders by status
- **Estado:** PASSED
- **Flujo probado:** Login → Sales → dropdown "All statuses" → seleccionar "Pending" → verificar que solo aparece "SO-2026-138" con estado "Pending"
- **Dashboard:** https://www.testsprite.com/dashboard/mcp/tests/efb6bc1f-1d36-4ed5-98d2-b75dbe74fe2f/c435446f-c2e4-4356-806e-93b946d8fe94

---

## CRUD de Proveedores — Resultado

El flujo completo **Crear → Editar → Eliminar proveedor** fue ejecutado por el agente dentro de **TC007** y **pasó**. Detalles verificados:

| Acción | Resultado | Detalles |
|--------|-----------|---------|
| Crear proveedor | ✅ PASS | "Proveedor Test" guardado con nombre, RUT, contacto, email, teléfono |
| **Editar proveedor** | ✅ PASS | Botón "Editar" abre `SupplierEditModal`; nombre y teléfono actualizados correctamente |
| Eliminar proveedor | ✅ PASS | Botón "Eliminar" dispara confirmación; proveedor removido de la tabla |

La funcionalidad de edición de proveedores implementada en [`frontend/src/features/purchases/Purchases.tsx`](../frontend/src/features/purchases/Purchases.tsx) (`SupplierEditModal` + botón "Editar") funciona correctamente end-to-end.

---

## Gaps / Riesgos Identificados

| # | Área | Riesgo | Prioridad |
|---|------|--------|-----------|
| 1 | Inventory delete | TC014 FAILED: producto no desaparece de UI tras eliminación. Posible fallo silencioso de API o `invalidateQueries` no ejecutándose. | **Alta** |
| 2 | Excel import | TC011 BLOCKED: no hay fixture `.xlsx`. UI funciona (modal abre, input accesible), solo falta el archivo de test. | Media |
| 3 | Dashboard/Sales | Datos mock en dashboard y ventas — no reflejan backend real. Tests que dependen de datos exactos pueden ser frágiles. | Baja |

---

## Archivos de Test Generados

Los siguientes scripts Playwright se generaron en `testsprite_tests/`:

| Archivo | Estado |
|---------|--------|
| [TC001_Log_in_and_open_the_authenticated_shell.py](./TC001_Log_in_and_open_the_authenticated_shell.py) | ✅ PASSED |
| [TC002_Process_a_sale_in_POS.py](./TC002_Process_a_sale_in_POS.py) | ✅ PASSED |
| [TC003_Process_a_cash_sale.py](./TC003_Process_a_cash_sale.py) | ✅ PASSED |
| [TC004_Search_and_filter_inventory_products.py](./TC004_Search_and_filter_inventory_products.py) | ✅ PASSED |
| [TC005_Save_company_settings_and_branding.py](./TC005_Save_company_settings_and_branding.py) | ✅ PASSED |
| [TC006_View_the_cash_register_workspace.py](./TC006_View_the_cash_register_workspace.py) | ✅ PASSED |
| [TC007_Change_language_and_theme_in_settings.py](./TC007_Change_language_and_theme_in_settings.py) | ✅ PASSED (incluye CRUD proveedores) |
| [TC008_Open_product_details_and_inspect_lots_and_movements.py](./TC008_Open_product_details_and_inspect_lots_and_movements.py) | ✅ PASSED |
| [TC009_Switch_the_app_to_dark_theme.py](./TC009_Switch_the_app_to_dark_theme.py) | ✅ PASSED |
| [TC010_Change_the_interface_language.py](./TC010_Change_the_interface_language.py) | ✅ PASSED |
| [TC011_Import_products_from_an_Excel_file.py](./TC011_Import_products_from_an_Excel_file.py) | 🔒 BLOCKED |
| [TC012_Review_dashboard_summary_and_open_inventory_from_top_products.py](./TC012_Review_dashboard_summary_and_open_inventory_from_top_products.py) | ✅ PASSED |
| [TC013_Add_a_new_expense.py](./TC013_Add_a_new_expense.py) | ✅ PASSED |
| [TC014_Delete_a_product_from_inventory.py](./TC014_Delete_a_product_from_inventory.py) | ❌ FAILED |
| [TC015_Filter_sales_orders_by_status.py](./TC015_Filter_sales_orders_by_status.py) | ✅ PASSED |
