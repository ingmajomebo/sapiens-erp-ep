---
tags: [guia, pruebas, ventas, inventario, uat]
fecha: 2026-08-24
---

# Validar una venta completa

> Guion para comprobar, a mano y sin conocimientos técnicos, que el sistema
> hace bien todo el recorrido: **el cliente compra → el pedido se despacha →
> se factura → se cobra → el inventario baja**.
>
> Toma unos 15 minutos. No necesitas saber programar.

Si quieres entender *por qué* el sistema funciona así, mira
[[architecture/flujo-venta-tienda]]. Este documento es solo para probarlo.

---

## Antes de empezar

**Ambiente de pruebas.** Todo esto se hace en desarrollo. Nada de lo que hagas
aquí afecta a clientes reales.

| Para qué | Dirección |
|---|---|
| Tienda (lo que ve el cliente) | `https://dev.encantopacificoerp.online` |
| Panel administrativo | `https://dev-admin.encantopacificoerp.online` |

**Ambos piden dos contraseñas seguidas.** Primero una ventana gris del
navegador, y después el formulario del sistema.

```
1) Ventana del navegador     usuario: equipo
2) Formulario del sistema    correo:  admin@encantopacificoerp.online
```

Las contraseñas te las da el equipo técnico. La primera empieza con **dos
i mayúsculas**, no con eles: conviene copiarla y pegarla en vez de escribirla.

**Ten a mano un papel** para anotar dos números: el stock antes y después.

---

## Paso 0 · Anota el stock inicial

1. Entra al **panel administrativo**.
2. Menú izquierdo → **Inventory**.
3. Busca **Atún de aleta amarillo**.
4. Anota la cantidad de la columna *Stock*.

> **Anota:** stock inicial = ______

Si el atún no tiene existencias, elige cualquier otro producto que sí las
tenga y úsalo durante toda la prueba.

---

## Paso 1 · Comprar como cliente

1. Abre la **tienda** en otra pestaña.
2. Arriba, menú **PRODUCTOS → Pescados → Atún**.
3. En la tarjeta del atún, pulsa **Añadir al carrito**.
   El carrito no se abre solo: verás que el número junto al icono de la bolsa,
   arriba a la derecha, cambia a **1**.
4. Pulsa ese **icono de la bolsa** para abrir el carrito y luego **Ir a pagar**.
5. Llena los datos. Puedes inventarlos, pero usa un nombre reconocible como
   *Prueba Ana 24 ago* para encontrarlo después:

   - Nombre completo
   - Teléfono (10 dígitos)
   - Dirección
   - Ciudad: escribe **Medellín**
6. Deja el pago en **Contra entrega**.
7. Pulsa **CONFIRMAR PEDIDO**.

**Qué debe pasar:** aparece una página que dice **PEDIDO RECIBIDO** con un
número tipo `EP-0010XX` y una línea de tiempo con cuatro pasos.

> **Anota:** número de pedido = ____________
> **Anota:** total que pagó el cliente = $ ____________

- [ ] Salió el número de pedido
- [ ] El total incluye el domicilio (es mayor que el precio del producto)

> **Ojo — defecto conocido:** el total que ves aquí *no* será el mismo que
> verás en el panel. Es un problema ya reportado, no lo reportes de nuevo.
> Ver *Defectos conocidos* al final.

---

## Paso 2 · Preparar y despachar

Vuelve al **panel administrativo**.

1. Menú izquierdo → **Sales**.
2. Busca tu pedido en la lista. Debe decir **Pendiente**.
3. Haz clic sobre el número del pedido: se abre un panel a la derecha.
4. Pulsa **▶ Preparar**.
5. Vuelve a abrir el pedido y pulsa **📦 Despachar**.
6. Vuelve a abrirlo y pulsa **✓ Entregar**.

**Qué debe pasar:** el estado va cambiando *Pendiente → En preparación → En
despacho → Entregado*, y los contadores de arriba se mueven.

- [ ] El pedido llegó a **Entregado**

> **Importante:** ve a **Inventory** y mira el stock del atún. **Debe seguir
> igual que al principio.** Esto no es un error: el inventario baja al
> facturar, no al entregar.

- [ ] El stock **no** cambió todavía

---

## Paso 3 · Generar la factura

1. Vuelve a **Sales** y abre tu pedido.
2. Pulsa **🧾 Generar factura**.

**Qué debe pasar:** el botón desaparece. La factura queda creada como
borrador, todavía sin número.

- [ ] El botón de generar factura desapareció

---

## Paso 4 · Cobrar (aquí baja el inventario)

1. Menú izquierdo → **Invoicing**.
2. Busca la fila con tu número de pedido. Debe decir **Borrador**.
3. Pulsa **💰 Cobrar**.
4. En la ventana que se abre, deja **Pago completo** y **Efectivo**.
5. Pulsa el botón azul **Cobrar $ …**.

**Qué debe pasar:** la ventana se cierra y la factura pasa a **Pagada**, ahora
con un número tipo `FV-0010XX`.

> **Anota:** número de factura = ____________

- [ ] La factura quedó **Pagada** y con número

**Si sale un error rojo que menciona `INSUFFICIENT_STOCK_AT_LOCATION`:**
no es culpa tuya ni de la prueba. Significa que ese producto tiene existencias
en el total pero no están asignadas a ninguna bodega. Anótalo y avisa al
equipo técnico — hay un script de reparación para eso.

---

## Paso 5 · Comprobar que el inventario bajó

1. Menú izquierdo → **Inventory**.
2. Busca **Atún de aleta amarillo**.

> **Anota:** stock final = ______

**La cuenta que debe cuadrar:**

```
stock inicial  −  unidades compradas  =  stock final
```

- [ ] La resta cuadra

Para ver el detalle del movimiento: abre el producto y mira su historial. Debe
aparecer una **salida** cuyo motivo dice `Venta FV-0010XX`, con el número de tu
factura.

- [ ] Existe el movimiento de salida con el número de la factura

---

## Resultado

La prueba **pasa** si marcaste todas las casillas. Si alguna falló, anota:

- En qué paso ocurrió
- Qué esperabas ver
- Qué viste (una captura de pantalla ayuda mucho)
- El número de pedido y de factura

---

## Defectos conocidos

No hace falta reportar estos: ya están registrados.

| Qué vas a notar | Estado |
|---|---|
| El total del panel **no incluye el domicilio**. El cliente paga $44.500 y la factura dice $36.500. | Reportado, pendiente |
| No hay botón **Emitir** separado. *Cobrar* emite y cobra de una vez, así que no se puede facturar a crédito sin cobrar. | Reportado, pendiente |
| Al ingresar mercancía se puede dejar la **bodega vacía**, y ese stock después no se puede facturar. | Reportado, en corrección |

---

## Preguntas frecuentes

**¿Por qué el stock no baja cuando entrego el pedido?**
Porque el descuento va atado a la factura, no a la entrega. Así, si después
hay que anular la factura, existe un documento contra el cual devolver el
stock. Es intencional.

**Hice varias pruebas y el inventario quedó bajo.**
Normal: cada prueba consume unidades de verdad. Pide al equipo que reponga
existencias en desarrollo, o usa un producto distinto cada vez.

**Me equivoqué a mitad de camino.**
Un pedido se puede cancelar desde su panel con **✕ Cancelar pedido**. Una
factura ya emitida se anula y genera nota crédito, que repone el stock
automáticamente.
