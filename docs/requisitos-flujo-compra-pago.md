# Documento de Requisitos Funcionales y No Funcionales
## Flujo Completo: Proveedor → Producto → Orden de Compra → Recepción → Factura → Pago → Caja/Banco

**Sistema:** Sapiens ERP — Módulos de Compras y Finanzas  
**Versión:** 2.0  
**Fecha:** 28 de junio de 2026  
**Autor:** Equipo Sapiens  

---

## 1. Descripción del Flujo

El flujo cubre el ciclo completo de aprovisionamiento desde la configuración inicial de datos maestros (proveedor y producto) hasta el descuento del dinero en la caja o banco al pagar la factura del proveedor.

```
[1]  Crear Proveedor
         ↓
[2]  Editar / Desactivar Proveedor
         ↓
[3]  Crear Producto
         ↓
[4]  Editar / Desactivar Producto
         ↓
[5]  Crear Orden de Compra  ──→  Editar OC (solo en DRAFT)
         ↓                            ↓
[6]  Confirmar OC           ←── Cancelar OC (DRAFT o CONFIRMED)
         ↓
[7]  Recibir Mercancía (total o parcial)
         ↓
[8]  Actualización automática de Inventario
         ↓
[9]  Generación automática de Factura de Proveedor
         ↓
[10] Consultar Factura en Cuentas por Pagar
         ↓
[11] Registrar Pago (parcial o total) seleccionando Caja/Banco
         ↓
[12] Descuento automático en cuenta financiera
         ↓
[13] Movimiento financiero de tipo EGRESO registrado
```

---

## 2. Requisitos Funcionales

---

### MÓDULO: PROVEEDORES

---

#### RF-001 — Crear Proveedor

| Campo | Detalle |
|-------|---------|
| **ID** | RF-001 |
| **Módulo** | Compras — Proveedores |
| **Descripción** | El sistema debe permitir registrar un nuevo proveedor con su información de contacto y fiscal. |
| **Campos obligatorios** | Nombre del proveedor. |
| **Campos opcionales** | Nombre de contacto, correo electrónico, teléfono, dirección, NIT/RUT, observaciones. |
| **Resultado esperado** | Proveedor creado con estado `ACTIVE`, ID único (UUID) asignado automáticamente, y timestamps `created_at` / `updated_at` registrados. |
| **Restricción** | No se permiten dos proveedores activos con el mismo nombre (validación por unicidad). |

---

#### RF-002 — Editar Proveedor

| Campo | Detalle |
|-------|---------|
| **ID** | RF-002 |
| **Módulo** | Compras — Proveedores |
| **Descripción** | El sistema debe permitir modificar cualquier campo del proveedor excepto su ID. |
| **Precondición** | El proveedor debe estar activo (`deleted_at IS NULL`). |
| **Resultado esperado** | Los datos del proveedor se actualizan. El campo `updated_at` se actualiza. Las órdenes de compra existentes asociadas al proveedor no se ven afectadas. |

---

#### RF-003 — Eliminar Proveedor (Soft Delete)

| Campo | Detalle |
|-------|---------|
| **ID** | RF-003 |
| **Módulo** | Compras — Proveedores |
| **Descripción** | El sistema debe desactivar un proveedor mediante soft delete (marcar `deleted_at`), no eliminación física. |
| **Precondición** | El proveedor debe estar activo. |
| **Resultado esperado** | El campo `deleted_at` se registra con la fecha actual. El proveedor ya no aparece en los listados activos ni en el selector de nuevas órdenes de compra. Las OC existentes asociadas al proveedor permanecen intactas. |
| **Restricción** | No se permite eliminar físicamente un proveedor que tenga órdenes de compra asociadas. |

---

### MÓDULO: PRODUCTOS

---

#### RF-004 — Crear Producto

| Campo | Detalle |
|-------|---------|
| **ID** | RF-004 |
| **Módulo** | Catálogo — Productos |
| **Descripción** | El sistema debe permitir crear un producto con su información comercial e inventario. |
| **Campos obligatorios** | Nombre, tipo de producto, tipo de unidad de medida. |
| **Campos opcionales** | SKU (auto-generado si no se ingresa), código de barras, categoría, costo de compra, precio de venta, bodega, stock mínimo/máximo, proveedor predeterminado, notas. |
| **Resultado esperado** | Producto creado con SKU único asignado automáticamente (`SKU-000001`), estado `ACTIVE`, timestamps registrados. |
| **Restricción** | El SKU debe ser único entre productos activos. No se permiten duplicados de nombre dentro de la misma categoría (recomendado). |

---

#### RF-005 — Editar Producto

| Campo | Detalle |
|-------|---------|
| **ID** | RF-005 |
| **Módulo** | Catálogo — Productos |
| **Descripción** | El sistema debe permitir modificar los datos del producto. El stock no puede editarse directamente desde este formulario. |
| **Precondición** | El producto debe estar activo. |
| **Resultado esperado** | Datos actualizados. `updated_at` actualizado. El stock actual permanece intacto (solo cambia mediante movimientos de inventario). |
| **Restricción** | Modificar el costo de compra no retroactúa sobre órdenes de compra existentes. |

---

#### RF-006 — Eliminar Producto (Soft Delete)

| Campo | Detalle |
|-------|---------|
| **ID** | RF-006 |
| **Módulo** | Catálogo — Productos |
| **Descripción** | El sistema debe desactivar un producto mediante soft delete. |
| **Precondición** | El producto debe estar activo. |
| **Resultado esperado** | `deleted_at` registrado. El producto no aparece en listados activos ni en el selector de líneas de OC. Las OC existentes que lo referencian permanecen intactas. |

---

### MÓDULO: ÓRDENES DE COMPRA

---

#### RF-007 — Crear Orden de Compra

| Campo | Detalle |
|-------|---------|
| **ID** | RF-007 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir crear una orden de compra seleccionando proveedor, productos, cantidades y costos. |
| **Campos obligatorios** | Proveedor, al menos una línea con: producto, cantidad > 0, costo unitario > 0. |
| **Campos opcionales** | Fecha de entrega esperada, observaciones por línea. |
| **Resultado esperado** | OC creada en estado `DRAFT` con número correlativo asignado (`OC-000001`), total calculado como suma de líneas (cantidad × costo unitario × impuesto/descuento), timestamps registrados. |

---

#### RF-008 — Editar Orden de Compra

| Campo | Detalle |
|-------|---------|
| **ID** | RF-008 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir modificar la OC (proveedor, líneas, cantidades, costos, fecha de entrega) mientras esté en estado `DRAFT`. |
| **Precondición** | La OC debe estar en estado `DRAFT`. |
| **Resultado esperado** | Los cambios se persisten. El total se recalcula. `updated_at` se actualiza. |
| **Restricción** | Una OC confirmada (`CONFIRMED`, `RECEIVED`, `PARTIALLY_RECEIVED`) no puede editarse. Intentar editarla devuelve error. |

---

#### RF-009 — Cancelar Orden de Compra

| Campo | Detalle |
|-------|---------|
| **ID** | RF-009 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir cancelar una OC en estado `DRAFT` o `CONFIRMED`. |
| **Precondición** | Estado `DRAFT` o `CONFIRMED`. |
| **Resultado esperado** | Estado cambia a `CANCELLED`. La OC queda en modo lectura. No genera impacto en inventario. |
| **Restricción** | No se puede cancelar una OC en estado `RECEIVED` o `PARTIALLY_RECEIVED` (ya generó inventario y factura). |

---

#### RF-010 — Confirmar Orden de Compra

| Campo | Detalle |
|-------|---------|
| **ID** | RF-010 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir confirmar una OC, indicando que el pedido fue enviado al proveedor. |
| **Precondición** | Estado `DRAFT` con al menos una línea. |
| **Resultado esperado** | Estado cambia a `CONFIRMED`. La OC queda bloqueada para edición. Ya puede recibirse mercancía. |
| **Restricción** | No se puede confirmar una OC cancelada o ya confirmada. |

---

#### RF-011 — Recibir Mercancía (Recepción Total)

| Campo | Detalle |
|-------|---------|
| **ID** | RF-011 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir registrar la recepción completa de todos los productos de la OC en las cantidades exactas ordenadas. |
| **Precondición** | Estado `CONFIRMED`. |
| **Resultado esperado** | Estado cambia a `RECEIVED`. Se crea registro de recepción. Se crean movimientos de inventario tipo `PURCHASE` por cada producto. Se genera factura de proveedor automáticamente. |

---

#### RF-012 — Recibir Mercancía (Recepción Parcial)

| Campo | Detalle |
|-------|---------|
| **ID** | RF-012 |
| **Módulo** | Compras — Órdenes de Compra |
| **Descripción** | El sistema debe permitir registrar la recepción de una cantidad menor a la ordenada en una o más líneas. |
| **Precondición** | Estado `CONFIRMED`. Al menos una línea debe recibir cantidad > 0. |
| **Resultado esperado** | Estado cambia a `PARTIALLY_RECEIVED`. El inventario se actualiza solo por las cantidades efectivamente recibidas. La factura se genera por el valor de lo recibido (no de lo ordenado). |
| **Restricción** | La cantidad recibida por línea no puede superar la cantidad ordenada. No se puede volver a recibir sobre una OC ya recibida (una sola recepción por OC). |

---

### MÓDULO: INVENTARIO

---

#### RF-013 — Actualización Automática de Inventario

| Campo | Detalle |
|-------|---------|
| **ID** | RF-013 |
| **Módulo** | Inventario |
| **Descripción** | Al registrar una recepción, el sistema debe crear automáticamente movimientos de inventario de tipo `PURCHASE` por cada producto con `quantityReceived > 0`. El stock se calcula como la suma de todos los movimientos. |
| **Precondición** | RF-011 o RF-012 completado. |
| **Resultado esperado** | Stock de cada producto aumenta exactamente en la cantidad recibida. Los movimientos quedan inmutables. |
| **Restricción** | El stock nunca se edita directamente. No existe operación `setStock()`. |

---

### MÓDULO: CUENTAS POR PAGAR

---

#### RF-014 — Generación Automática de Factura de Proveedor

| Campo | Detalle |
|-------|---------|
| **ID** | RF-014 |
| **Módulo** | Finanzas — Cuentas por Pagar |
| **Descripción** | Al completar la recepción (total o parcial), el sistema debe generar automáticamente una factura de proveedor basada en las cantidades **recibidas**. |
| **Precondición** | RF-011 o RF-012 completado. |
| **Resultado esperado** | Factura creada con: número correlativo (`FAC-000001`), total = suma de (cantidad recibida × costo unitario × factor impuesto/descuento), estado `PENDING`, fecha de vencimiento a 30 días, asociada a la recepción y a la OC. |
| **Restricción** | Solo se genera una factura por OC. No se puede crear manualmente. |

---

#### RF-015 — Consultar Factura en Cuentas por Pagar

| Campo | Detalle |
|-------|---------|
| **ID** | RF-015 |
| **Módulo** | Finanzas — Cuentas por Pagar |
| **Descripción** | El sistema debe mostrar en el módulo de Cuentas por Pagar la lista de todas las facturas con su proveedor, total, pagado, pendiente y estado. |
| **Resultado esperado** | Tabla con filtros por estado y por proveedor. KPIs con totales pendiente, pagado, vencidas y facturadas en el mes. |

---

#### RF-016 — Registrar Pago Parcial

| Campo | Detalle |
|-------|---------|
| **ID** | RF-016 |
| **Módulo** | Finanzas — Cuentas por Pagar |
| **Descripción** | El sistema debe permitir registrar un pago por un monto menor al saldo pendiente de la factura. |
| **Precondición** | Factura en estado `PENDING` o `PARTIALLY_PAID`. |
| **Campos obligatorios** | Monto > 0 y ≤ saldo pendiente, fecha de pago. |
| **Campos opcionales** | Método de pago, caja/banco origen, cuenta destino del proveedor, número de comprobante, observación. |
| **Resultado esperado** | Estado cambia a `PARTIALLY_PAID`. `paidAmount` aumenta en el monto. `pendingAmount` disminuye. El pago queda en el historial. |

---

#### RF-017 — Registrar Pago Total

| Campo | Detalle |
|-------|---------|
| **ID** | RF-017 |
| **Módulo** | Finanzas — Cuentas por Pagar |
| **Descripción** | El sistema debe permitir registrar un pago por el monto exacto del saldo pendiente. |
| **Precondición** | Factura en estado `PENDING` o `PARTIALLY_PAID`. |
| **Resultado esperado** | Estado cambia a `PAID`. `paidAmount` = `totalAmount`. `pendingAmount` = 0. El botón "Registrar pago" desaparece en la UI. |

---

#### RF-018 — Historial de Pagos de Factura

| Campo | Detalle |
|-------|---------|
| **ID** | RF-018 |
| **Módulo** | Finanzas — Cuentas por Pagar |
| **Descripción** | El sistema debe mostrar el historial completo de todos los pagos realizados sobre una factura. |
| **Resultado esperado** | Lista ordenada de más reciente a más antiguo con: fecha, monto, método de pago, cuenta origen, número de referencia. |

---

### MÓDULO: CAJA Y BANCOS

---

#### RF-019 — Descuento Automático en Cuenta Financiera

| Campo | Detalle |
|-------|---------|
| **ID** | RF-019 |
| **Módulo** | Finanzas — Caja y Bancos |
| **Descripción** | Cuando se registra un pago con una cuenta financiera seleccionada, el sistema debe descontar automáticamente el monto del saldo de esa cuenta y registrar un movimiento de tipo `EXPENSE`. |
| **Precondición** | RF-016 o RF-017 completado con cuenta financiera seleccionada. |
| **Resultado esperado** | `currentBalance` de la cuenta disminuye exactamente en el monto pagado. Se crea `FinancialMovement` con: tipo `EXPENSE`, concepto incluyendo nombre del proveedor y número de factura, saldo anterior y saldo posterior, referencia al documento. |

---

#### RF-020 — Historial de Movimientos de Cuenta

| Campo | Detalle |
|-------|---------|
| **ID** | RF-020 |
| **Módulo** | Finanzas — Caja y Bancos |
| **Descripción** | El sistema debe mostrar todos los movimientos (ingresos y egresos) de cada cuenta financiera. |
| **Resultado esperado** | Tabla con: fecha, tipo (Ingreso/Egreso), concepto, monto, saldo anterior, saldo posterior, documento relacionado. Ordenada de más reciente a más antiguo. |

---

## 3. Requisitos No Funcionales

---

### RNF-001 — Integridad del Stock (No edición directa)

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-001 |
| **Categoría** | Integridad de datos |
| **Descripción** | El stock de un producto nunca debe modificarse directamente. Toda variación debe quedar registrada como movimiento de inventario. |
| **Criterio de aceptación** | No existe endpoint ni función que permita `UPDATE stock` directamente. La tabla de inventario no tiene operación de actualización de stock. |

---

### RNF-002 — Inmutabilidad de Movimientos

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-002 |
| **Categoría** | Integridad de datos |
| **Descripción** | Los movimientos de inventario y los movimientos financieros son inmutables una vez creados. No pueden editarse ni eliminarse. |
| **Criterio de aceptación** | No existen endpoints `PUT` ni `DELETE` sobre movimientos. Intentar eliminar devuelve `HTTP 405`. |

---

### RNF-003 — Soft Delete Obligatorio

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-003 |
| **Categoría** | Integridad de datos |
| **Descripción** | Las entidades de negocio (proveedores, productos) no deben eliminarse físicamente. Deben marcarse con `deleted_at`. |
| **Criterio de aceptación** | Un proveedor "eliminado" sigue existiendo en la base de datos con `deleted_at` poblado. Las OC asociadas permanecen intactas. |

---

### RNF-004 — Consistencia Transaccional en Recepción

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-004 |
| **Categoría** | Consistencia |
| **Descripción** | La recepción de mercancía, la actualización del estado de la OC, la creación de movimientos de inventario y la generación de la factura deben ejecutarse en una única transacción de base de datos. |
| **Criterio de aceptación** | Si cualquier paso falla, ninguno de los anteriores persiste. No quedan datos parciales. |

---

### RNF-005 — Atomicidad del Pago

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-005 |
| **Categoría** | Consistencia |
| **Descripción** | El registro del pago, la actualización de la factura y el descuento en la cuenta financiera deben ser atómicos. |
| **Criterio de aceptación** | Si el descuento en la cuenta falla, el pago no se persiste y la factura no se modifica. |

---

### RNF-006 — Validación de Saldo en Pago

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-006 |
| **Categoría** | Reglas de negocio |
| **Descripción** | No se permite registrar un pago por un monto mayor al saldo pendiente de la factura. |
| **Criterio de aceptación** | Backend responde `HTTP 422` con mensaje descriptivo. El frontend desactiva el botón si el monto supera el saldo. |

---

### RNF-007 — Estados Válidos de OC

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-007 |
| **Categoría** | Reglas de negocio |
| **Descripción** | Las transiciones de estado de la OC deben seguir el flujo definido. No se permiten transiciones inválidas. |
| **Transiciones válidas** | `DRAFT → CONFIRMED`, `DRAFT → CANCELLED`, `CONFIRMED → PARTIALLY_RECEIVED`, `CONFIRMED → RECEIVED`, `CONFIRMED → CANCELLED`. |
| **Transiciones inválidas** | `RECEIVED → CONFIRMED`, `CANCELLED → CONFIRMED`, `PAID → cualquier estado`. |
| **Criterio de aceptación** | Cualquier transición inválida devuelve `HTTP 422`. |

---

### RNF-008 — Una Factura por Orden de Compra

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-008 |
| **Categoría** | Reglas de negocio |
| **Descripción** | Solo puede existir una factura de proveedor por orden de compra. |
| **Criterio de aceptación** | Intentar generar una segunda factura para la misma OC no crea un duplicado. El sistema devuelve la factura existente. |

---

### RNF-009 — Seguridad y Autenticación

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-009 |
| **Categoría** | Seguridad |
| **Descripción** | Todas las operaciones de escritura (crear, confirmar, recibir, pagar) requieren token JWT válido con rol mínimo `SUPERVISOR`. Las operaciones de lectura requieren rol mínimo `OPERADOR`. |
| **Criterio de aceptación** | Sin token → `HTTP 401`. Con rol insuficiente → `HTTP 403`. Con token válido y rol correcto → operación exitosa. |

---

### RNF-010 — Rendimiento

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-010 |
| **Categoría** | Rendimiento |
| **Descripción** | Cada endpoint del flujo debe responder en menos de 1 segundo bajo carga normal. |
| **Criterio de aceptación** | Medido con Postman o curl: todas las respuestas < 1000 ms en entorno local con base de datos activa. |

---

### RNF-011 — Trazabilidad con Timestamps

| Campo | Detalle |
|-------|---------|
| **ID** | RNF-011 |
| **Categoría** | Auditoría |
| **Descripción** | Todas las entidades críticas deben tener `created_at` y `updated_at`. Las entidades con soft delete deben tener `deleted_at`. |
| **Criterio de aceptación** | Verificar en base de datos que los campos están poblados correctamente después de cada operación. |

---

## 4. Casos de Prueba

---

### CP-001 — Crear Proveedor (Camino Feliz)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Compras → Proveedores → Nueva proveedor | Se abre el formulario |
| 2 | Ingresar: Nombre "Distribuidora del Mar S.A.S", NIT "900123456-7", teléfono "3001234567", correo "contacto@delmar.co" | Campos diligenciados |
| 3 | Guardar | Proveedor creado, aparece en la lista con estado Activo |
| 4 | Verificar en BD: `SELECT * FROM suppliers WHERE name = 'Distribuidora del Mar S.A.S'` | Registro existe con `deleted_at = NULL` y timestamps correctos |

---

### CP-002 — Editar Proveedor

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Seleccionar el proveedor creado en CP-001 | Se abre el formulario con datos actuales |
| 2 | Cambiar teléfono a "3109876543" y correo a "ventas@delmar.co" | Campos actualizados |
| 3 | Guardar | Cambios persistidos, `updated_at` mayor que `created_at` |

---

### CP-003 — Eliminar Proveedor (Soft Delete)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Crear un proveedor de prueba "Proveedor Temporal" | Creado |
| 2 | Eliminarlo desde la interfaz | Ya no aparece en la lista de proveedores activos |
| 3 | Verificar en BD: `SELECT deleted_at FROM suppliers WHERE name = 'Proveedor Temporal'` | `deleted_at` tiene fecha, el registro existe |

---

### CP-004 — Crear Producto (Camino Feliz)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Inventario → Nuevo producto | Se abre el formulario |
| 2 | Ingresar: Nombre "Salmón Atlántico", Tipo "Materia prima", Unidad "Kilogramo (kg)", Costo $30.000, Precio de venta $45.000, Bodega "Bodega principal" | Campos diligenciados |
| 3 | Guardar | Producto creado con SKU auto-generado (`SKU-000001`), stock 0 |
| 4 | Verificar SKU en pantalla | Formato `SKU-XXXXXX` visible |

---

### CP-005 — Editar Producto

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Abrir el producto "Salmón Atlántico" | Formulario con datos actuales |
| 2 | Cambiar costo de compra a $32.000 | Campo actualizado |
| 3 | Guardar | Cambios persistidos. Stock actual no cambia. `updated_at` actualizado |

---

### CP-006 — Crear Orden de Compra (Camino Feliz)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Compras → Nueva orden de compra | Se abre el formulario |
| 2 | Seleccionar proveedor "Distribuidora del Mar S.A.S" | Proveedor asignado |
| 3 | Agregar línea: Salmón Atlántico, 10 kg, $32.000/kg | Línea agregada. Subtotal = $320.000 |
| 4 | Agregar línea: Camarón Tigre, 5 kg, $25.000/kg | Línea agregada. Total OC = $445.000 |
| 5 | Guardar | OC creada en estado `DRAFT` con número `OC-000001` |

---

### CP-007 — Editar Orden de Compra en DRAFT

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Abrir la OC en estado `DRAFT` | Formulario editable |
| 2 | Cambiar cantidad de Salmón de 10 kg a 8 kg | Total recalculado: $256.000 + $125.000 = $381.000 |
| 3 | Guardar | Cambios persistidos. Estado sigue en `DRAFT` |

---

### CP-008 — Cancelar Orden de Compra en DRAFT

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Crear una OC de prueba en `DRAFT` | OC creada |
| 2 | Cancelarla | Estado cambia a `CANCELLED`. La OC queda en modo lectura. No afecta inventario ni finanzas |

---

### CP-009 — Confirmar Orden de Compra

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Abrir la OC del CP-006 en estado `DRAFT` | — |
| 2 | Confirmar | Estado cambia a `CONFIRMED`. El botón de edición desaparece |
| 3 | Intentar editar la OC confirmada | El sistema no permite la edición |

---

### CP-010 — Cancelar Orden de Compra en CONFIRMED

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Tener una OC en estado `CONFIRMED` | — |
| 2 | Cancelarla | Estado cambia a `CANCELLED`. No se generan movimientos de inventario ni factura |

---

### CP-011 — Recepción Total de Mercancía

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Abrir la OC confirmada (CP-009) | Estado `CONFIRMED` |
| 2 | Hacer clic en "Recibir productos" | Se abre el formulario de recepción |
| 3 | Ingresar: Salmón 8 kg recibido (= ordenado), Camarón 5 kg recibido (= ordenado) | Cantidades completas |
| 4 | Confirmar recepción | Estado OC cambia a `RECEIVED` |
| 5 | Verificar stock Salmón Atlántico | +8 kg (de 0 → 8 kg) |
| 6 | Verificar stock Camarón Tigre | +5 kg (de 0 → 5 kg) |
| 7 | Verificar factura generada en Cuentas por Pagar | Factura `FAC-000001`, total = $381.000, estado `PENDING` |

---

### CP-012 — Recepción Parcial de Mercancía

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Crear y confirmar nueva OC: 10 kg Salmón a $32.000, 5 kg Camarón a $25.000 | OC `CONFIRMED`, total = $445.000 |
| 2 | Abrir formulario de recepción | — |
| 3 | Ingresar: Salmón 6 kg recibido (de 10), Camarón 5 kg recibido (de 5) | Salmón incompleto |
| 4 | Confirmar recepción | Estado OC: `PARTIALLY_RECEIVED` |
| 5 | Verificar stock | Salmón +6 kg, Camarón +5 kg |
| 6 | Verificar factura | Total = (6 × $32.000) + (5 × $25.000) = $317.000 (por lo recibido, no lo ordenado) |

---

### CP-013 — Intentar Recibir Más de lo Ordenado (Negativo)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | OC con 5 kg de Salmón, estado `CONFIRMED` | — |
| 2 | Ingresar 8 kg en el campo de cantidad recibida | Frontend: muestra error de validación, deshabilita el botón de confirmar. Backend: `HTTP 422` si se envía igual |

---

### CP-014 — Intentar Recibir en OC ya Recibida (Negativo)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | OC en estado `RECEIVED` o `PARTIALLY_RECEIVED` | — |
| 2 | Intentar abrir el formulario de recepción | El botón de recibir no aparece en la UI. Backend: `HTTP 422` si se intenta por API |

---

### CP-015 — Consultar Factura en Cuentas por Pagar

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Finanzas → Cuentas por Pagar | Tabla de facturas |
| 2 | Verificar que aparece `FAC-000001` de "Distribuidora del Mar S.A.S" | Fila visible con estado `PENDING` |
| 3 | Filtrar por proveedor "Distribuidora del Mar S.A.S" | Solo aparecen facturas de ese proveedor |
| 4 | Filtrar por estado "Pendiente" | Solo aparecen facturas pendientes |
| 5 | Hacer clic en "Detalle" de la factura | Modal con total, pagado, pendiente e información del proveedor y OC |

---

### CP-016 — Registrar Pago Parcial con Descuento en Caja

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Finanzas → Caja y Bancos, verificar saldo de "Caja principal" | Anotar saldo inicial (ej: $1.000.000) |
| 2 | Ir a Finanzas → Cuentas por Pagar, abrir `FAC-000001` | Estado `PENDING`, total $381.000 |
| 3 | Hacer clic en "Registrar pago" | Se abre el formulario de pago |
| 4 | Ingresar monto $200.000, fecha hoy, método "Transferencia", caja "Caja principal", referencia "TRF-001" | Campos diligenciados |
| 5 | Confirmar pago | Pago registrado. Factura cambia a `PARTIALLY_PAID`. Saldo pendiente: $181.000 |
| 6 | Verificar saldo "Caja principal" | Disminuyó en $200.000 → saldo = $800.000 |
| 7 | Verificar movimiento en "Caja principal" | Movimiento tipo `EGRESO`, monto $200.000, concepto incluye "Distribuidora del Mar" y "FAC-000001", saldo anterior $1.000.000, saldo posterior $800.000 |

---

### CP-017 — Registrar Pago Total (Saldo la Factura)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Continuando CP-016: Factura con saldo pendiente $181.000 | Estado `PARTIALLY_PAID` |
| 2 | Registrar pago por $181.000 desde "Caja principal" | Factura pasa a `PAID`. Saldo pendiente = $0 |
| 3 | Verificar que el botón "Registrar pago" ya no aparece | Confirmado en UI |
| 4 | Verificar historial de pagos | 2 pagos: $200.000 y $181.000 |
| 5 | Verificar saldo "Caja principal" | Disminuyó $181.000 adicionales. Saldo = $619.000 |

---

### CP-018 — Intentar Pagar Más del Saldo Pendiente (Negativo)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Factura con saldo pendiente $100.000 | Estado `PARTIALLY_PAID` o `PENDING` |
| 2 | Intentar registrar pago de $150.000 | Frontend: botón deshabilitado y mensaje de error en el campo de monto. Backend: `HTTP 422` con mensaje "El pago supera el saldo pendiente" |
| 3 | Verificar que la factura no cambió | Estado y saldos sin modificación |

---

### CP-019 — Intentar Pagar Factura en Estado PAID (Negativo)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Factura en estado `PAID` | Saldo = $0 |
| 2 | Buscar el botón "Registrar pago" | No aparece en la UI |
| 3 | Intentar la llamada directamente por API: `POST /api/v1/accounts-payable/{id}/pay` | `HTTP 422` con mensaje "Esta factura ya está pagada completamente" |

---

### CP-020 — Filtrar Facturas por Proveedor

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Ir a Finanzas → Cuentas por Pagar con múltiples facturas de diferentes proveedores | Tabla completa visible |
| 2 | Seleccionar "Distribuidora del Mar S.A.S" en el filtro de proveedor | Solo aparecen facturas de ese proveedor |
| 3 | Combinar con filtro de estado "Pendiente" | Solo facturas pendientes de ese proveedor |
| 4 | Hacer clic en "Limpiar filtros ×" | Vuelven a aparecer todas las facturas |

---

### CP-021 — Pago Sin Seleccionar Cuenta Financiera (Comportamiento Opcional)

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Registrar pago de una factura sin seleccionar Caja/Banco | Pago registrado. Factura actualiza saldo y estado |
| 2 | Verificar movimientos en todas las cuentas financieras | No se creó ningún movimiento en ninguna cuenta |

---

## 5. Casos de Prueba de Seguridad

### CP-S01 — Acceso sin Autenticación

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Llamar `POST /api/v1/purchase-orders` sin token JWT | `HTTP 401 Unauthorized` |
| 2 | Llamar `GET /api/v1/accounts-payable` sin token JWT | `HTTP 401 Unauthorized` |

### CP-S02 — Acceso con Rol Insuficiente

| # | Acción | Resultado Esperado |
|---|--------|--------------------|
| 1 | Autenticarse como `OPERADOR` | Token válido |
| 2 | Intentar `POST /api/v1/accounts-payable/{id}/pay` | `HTTP 403 Forbidden` |
| 3 | Intentar `POST /api/v1/purchase-orders/{id}/confirm` | `HTTP 403 Forbidden` |

---

## 6. Matriz de Trazabilidad RF → CP

| Requisito | CP-001 | CP-002 | CP-003 | CP-004 | CP-005 | CP-006 | CP-007 | CP-008 | CP-009 | CP-010 | CP-011 | CP-012 | CP-013 | CP-014 | CP-015 | CP-016 | CP-017 | CP-018 | CP-019 | CP-020 | CP-021 |
|-----------|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|
| RF-001 Crear Proveedor       | ✓ | | | | | | | | | | | | | | | | | | | | |
| RF-002 Editar Proveedor      | | ✓ | | | | | | | | | | | | | | | | | | | |
| RF-003 Eliminar Proveedor    | | | ✓ | | | | | | | | | | | | | | | | | | |
| RF-004 Crear Producto        | | | | ✓ | | | | | | | | | | | | | | | | | |
| RF-005 Editar Producto       | | | | | ✓ | | | | | | | | | | | | | | | | |
| RF-007 Crear OC              | | | | | | ✓ | | | | | | ✓ | | | | | | | | | |
| RF-008 Editar OC             | | | | | | | ✓ | | | | | | | | | | | | | | |
| RF-009 Cancelar OC           | | | | | | | | ✓ | | ✓ | | | | | | | | | | | |
| RF-010 Confirmar OC          | | | | | | | | | ✓ | | ✓ | ✓ | ✓ | ✓ | | | | | | | |
| RF-011 Recepción Total       | | | | | | | | | | | ✓ | | | | | | | | | | |
| RF-012 Recepción Parcial     | | | | | | | | | | | | ✓ | ✓ | ✓ | | | | | | | |
| RF-013 Actualizar Inventario | | | | | | | | | | | ✓ | ✓ | | | | | | | | | |
| RF-014 Generar Factura       | | | | | | | | | | | ✓ | ✓ | | | | | | | | | |
| RF-015 Consultar Factura     | | | | | | | | | | | | | | | ✓ | | | | | ✓ | |
| RF-016 Pago Parcial          | | | | | | | | | | | | | | | | ✓ | | ✓ | | | ✓ |
| RF-017 Pago Total            | | | | | | | | | | | | | | | | | ✓ | | ✓ | | |
| RF-018 Historial de Pagos    | | | | | | | | | | | | | | | | ✓ | ✓ | | | | |
| RF-019 Descuento en Cuenta   | | | | | | | | | | | | | | | | ✓ | ✓ | | | | ✓ |
| RF-020 Movimientos de Cuenta | | | | | | | | | | | | | | | | ✓ | ✓ | | | | |

---

## 7. Endpoints del API Involucrados

| Paso | Método | Endpoint | Descripción |
|------|--------|----------|-------------|
| Crear proveedor | POST | `/api/v1/suppliers` | Registra nuevo proveedor |
| Listar proveedores | GET | `/api/v1/suppliers` | Lista proveedores activos |
| Editar proveedor | PUT | `/api/v1/suppliers/{id}` | Actualiza datos del proveedor |
| Eliminar proveedor | DELETE | `/api/v1/suppliers/{id}` | Soft delete |
| Crear producto | POST | `/api/v1/products` | Registra nuevo producto |
| Listar productos | GET | `/api/v1/products` | Lista productos activos |
| Editar producto | PUT | `/api/v1/products/{id}` | Actualiza datos del producto |
| Crear OC | POST | `/api/v1/purchase-orders` | Crea OC en `DRAFT` |
| Listar OC | GET | `/api/v1/purchase-orders` | Lista todas las OC |
| Ver OC | GET | `/api/v1/purchase-orders/{id}` | Detalle de una OC |
| Confirmar OC | POST | `/api/v1/purchase-orders/{id}/confirm` | `DRAFT → CONFIRMED` |
| Cancelar OC | POST | `/api/v1/purchase-orders/{id}/cancel` | `→ CANCELLED` |
| Recibir mercancía | POST | `/api/v1/purchase-orders/{id}/receive` | Recepción + inventario + factura |
| Ver recepción | GET | `/api/v1/purchase-orders/{id}/receipt` | Detalle de recepción |
| Listar facturas AP | GET | `/api/v1/accounts-payable` | Todas las facturas de proveedor |
| Factura por OC | GET | `/api/v1/accounts-payable/by-purchase-order/{poId}` | Factura asociada a una OC |
| Registrar pago | POST | `/api/v1/accounts-payable/{id}/pay` | Paga la factura |
| Historial de pagos | GET | `/api/v1/accounts-payable/{id}/payments` | Pagos de una factura |
| Listar cuentas | GET | `/api/v1/financial-accounts` | Cajas y bancos |
| Crear cuenta | POST | `/api/v1/financial-accounts` | Nueva cuenta financiera |
| Movimientos cuenta | GET | `/api/v1/financial-accounts/{id}/movements` | Movimientos de una cuenta |

---

*Documento de Requisitos v2.0 — Flujo Completo de Aprovisionamiento y Pago — Sapiens ERP*  
*Última actualización: 28 de junio de 2026*
