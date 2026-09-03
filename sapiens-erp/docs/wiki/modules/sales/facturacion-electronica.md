---
tags: [ventas, facturacion-electronica, dian, integracion]
fecha: 2026-08-28
---

# Facturación electrónica (DIAN)

Radica las facturas de venta ante la DIAN a través de un proveedor externo.
El proveedor es **intercambiable**: el dominio habla con una interfaz y nunca
con un proveedor concreto.

## Piezas

| Pieza | Dónde | Qué hace |
|-------|-------|----------|
| `ElectronicInvoicingProvider` | `sales/domain/einvoicing/` | El puerto. Lo único que conoce el dominio |
| `ElectronicInvoiceDocument` | `sales/domain/einvoicing/` | Rastro de cada factura ante la DIAN |
| `MatiasInvoicingProvider` | `sales/infrastructure/einvoicing/` | Adaptador de MATIAS |
| `MatiasPayloadMapper` | `sales/infrastructure/einvoicing/` | Traduce la factura al cuerpo de la API |
| `DisabledInvoicingProvider` | `sales/infrastructure/einvoicing/` | Relleno cuando no hay proveedor |
| `EInvoicingConfig` | `sales/infrastructure/einvoicing/` | **Único** sitio que conoce la lista de proveedores |
| `ElectronicInvoicingService` | `sales/application/` | Orquesta envío, reintento y consulta |

Agregar un proveedor nuevo = escribir su adaptador + un `case` en
`EInvoicingConfig`. Nada más cambia.

## Configuración

Todo por variables de entorno; ninguna credencial en el repositorio ni en la
base de datos. Ver `deploy/env/*.env.example`.

```
EINVOICING_PROVIDER=matias          # none | matias
EINVOICING_ENVIRONMENT=sandbox      # sandbox | production
EINVOICING_TOKEN=...
EINVOICING_ISSUER_TAX_ID=900123456
EINVOICING_ISSUER_RESOLUTION=18764074347312
EINVOICING_ISSUER_PREFIX=FEV
```

Sin configurar, el ERP funciona igual y las facturas simplemente no se radican.
Es deliberado: es mejor que enviar documentos con datos de relleno a nombre de
la empresa.

## Estados

Son **independientes** del estado de la factura. Una factura puede estar PAGADA
y rechazada por la DIAN: el cliente pagó, pero el documento legal no existe.

| Estado | Significa | ¿Reintentar? |
|--------|-----------|--------------|
| `PENDING` | Emitida, aún no enviada | Sí |
| `SUBMITTED` | Enviada, la DIAN no da veredicto | Consultar estado |
| `ACCEPTED` | Validada. Ya hay CUFE | No |
| `REJECTED` | Rechazada por datos | Solo tras corregir |
| `FAILED` | No se pudo enviar (red, credenciales) | Sí |

## Cuándo se envía

Al emitir, **después** de confirmar la transacción:

1. `emit()` descuenta inventario y abre la CxC, todo en una transacción.
2. Dentro de esa transacción nace el documento `PENDING`.
3. Confirmada la transacción, un `@TransactionalEventListener(AFTER_COMMIT)`
   hace el envío.

Meter la llamada HTTP dentro de la transacción mantendría bloqueos de base de
datos hasta un minuto y haría que una caída del proveedor impidiera vender.

**La contrapartida es real**: entre emitir y que la DIAN acepte hay una ventana
en la que la factura está entregada pero no radicada. Por eso el estado se
muestra en la pantalla de la factura en vez de esconderse.

## Decisiones que conviene no revertir sin pensarlo

**Un rechazo no es una excepción.** Que la DIAN rechace es una respuesta
legítima que hay que guardar y mostrar. Solo se lanza excepción cuando la
conversación con el proveedor no llegó a ocurrir.

**Los totales se recalculan al mapear.** El ERP guarda cuatro decimales y la
DIAN admite dos. Redondear cada línea y copiar el total ya guardado produce
diferencias de centavos y un rechazo cuyo mensaje no señala la causa. Los
totales enviados se suman desde las líneas ya redondeadas: cuadran por
construcción.

**Los códigos desconocidos no se adivinan.** Cédula de extranjería y pasaporte
no tienen id documentado en la tabla del proveedor. El mapeo falla con un
mensaje que dice qué variable definir, en vez de enviar un número inventado que
produciría un rechazo sin causa visible.

**Una consulta de estado fallida no cambia el estado.** Marcar `FAILED` haría
perder el CUFE y con él la posibilidad de volver a preguntar.

## Probado contra el sandbox real

`MatiasSandboxLiveTest` ejercita el mismo camino que usa el ERP —mapeador y
proveedor reales— contra `sandbox-api.matias-api.com`. Solo corre si existe
`EINVOICING_TOKEN` en el entorno:

```bash
cd backend
export $(grep -E '^EINVOICING_TOKEN' ../.env | xargs)
./gradlew test --tests '*MatiasSandboxLiveTest*'
```

Resultado: factura **aceptada** por la DIAN con CUFE, PDF y XML firmado; los
rechazos simulados (`ERROR_REJECTED`, `ERROR_DUPLICATE`) se leen como resultado.

### Lo que solo apareció llamando de verdad

**`ErrorMessage.string` no siempre es una lista.** La documentación la muestra
como array; la API devuelve un texto cuando hay un solo mensaje. Sin
`ACCEPT_SINGLE_VALUE_AS_ARRAY`, una factura ACEPTADA se leía como "respuesta
ilegible" y quedaba marcada fallida pese a estar radicada: el peor error posible
de este módulo.

**El GetStatus del ambiente de habilitación se cae.** Devuelve un fallo SOAP con
HTTP 200 y `success: false`. La primera versión lo interpretaba como rechazo, y
eso convertía facturas ya aceptadas en rechazadas. Ahora una consulta sin
veredicto lanza excepción y **el estado no cambia**.

**Las unidades de medida sí existen** en `GET /quantity-units` (1093 registros),
aunque no estén documentadas: kilogramo = `767`, libra = `802`, unidad = `70`,
paquete = `923`, litro = `821`. El `1093` que se usaba por defecto significa
"mutuamente definido", y así salía impreso en la factura.

### Códigos confirmados contra la API

| Concepto | Valor | Cómo se confirmó |
|----------|-------|------------------|
| `type_document_id` factura | 7 | `GET /resolutions` |
| `identity_document_id` cédula | 1 | `GET /company` (persona natural) |
| `identity_document_id` NIT | 3 | referencia de campos |
| `operation_type_id` estándar | 1 | imprime "(10) Estandar" |

## Pendiente

- El **catálogo de municipios DANE** no existe: la ficha de cliente guarda la
  ciudad como texto libre. Se envía `EINVOICING_DEFAULT_CITY_ID`, así que la
  factura sale con la ciudad del emisor aunque el cliente esté en otra.
- **El descuento de línea no se imprime.** Se pliega dentro de
  `line_extension_amount`, así que el total es correcto pero la representación
  gráfica muestra "Descuento detalle $0,00". Para que se vea hay que enviar
  `allowance_charges`.
- **Cédula de extranjería y pasaporte** no tienen id conocido; hay que definir
  `EINVOICING_DOCUMENTTYPEIDS_CE` / `_PASSPORT` antes de facturarle a alguien
  con esos documentos.
- **Notas crédito** electrónicas: al anular una factura se genera nota crédito
  interna, que todavía no se radica.

## Ver también

- [[modules/sales/module]]
- Documentación del proveedor: https://docs.matias-api.com
