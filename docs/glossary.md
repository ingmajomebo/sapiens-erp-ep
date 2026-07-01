# Glosario de Términos del Dominio — Sapiens ERP

## Negocio (pescadería)

| Término | Definición |
|---------|-----------|
| **Lote** | Grupo de unidades del mismo producto recibidas en una misma compra. Cada lote tiene precio, fecha de ingreso y fecha de vencimiento. |
| **Merma** | Pérdida de stock por deterioro, rotura o vencimiento. Requiere motivo obligatorio. |
| **Stock mínimo** | Cantidad mínima que debe haber de un producto antes de emitir alerta. |
| **Costo promedio ponderado** | Precio de referencia del inventario. Se recalcula en cada entrada usando la fórmula de promedio ponderado. |
| **Último costo de compra** | El precio unitario pagado en la recepción más reciente de un producto. |
| **Orden de compra (OC)** | Documento formal de pedido a un proveedor. Pasa por los estados: DRAFT → CONFIRMED → RECEIVED. |
| **Recepción** | Registro de los productos físicamente recibidos al ejecutar una OC. Puede ser parcial. |
| **Cuenta por pagar** | Deuda generada automáticamente al recibir una OC. Número de factura formato `FAC-000001`. |
| **Cuenta financiera** | Caja, banco o billetera digital donde se registran los pagos. |
| **Movimiento financiero** | Registro de un INGRESO o EGRESO en una cuenta financiera, con saldo antes/después. |

## Técnico

| Término | Definición |
|---------|-----------|
| **Soft delete** | Eliminación lógica: se registra `deleted_at` en lugar de borrar la fila físicamente. |
| **Movimiento de inventario** | Registro inmutable de cualquier cambio de stock (entrada, salida, merma, ajuste). |
| **FIFO** | First In, First Out. Política de consumo de lotes: el más antiguo se consume primero. |
| **AuditableEntity** | Clase base JPA con `createdAt`, `updatedAt`, `deletedAt`. Todos los agregados la extienden. |
| **Bounded Context** | Módulo autónomo con su propio modelo de dominio y responsabilidades. |
| **UUID** | Identificador único universal. Todas las PKs del sistema son UUID generados en la aplicación. |
| **Prompt Plan** | Registro de un prompt destinado a Claude Code para planificar implementaciones. |
| **Sprint** | Ciclo de trabajo del equipo de desarrollo (2 semanas típicamente). |
| **Historia de usuario** | Requisito funcional en formato "Como X, quiero Y, para Z" con escenarios Gherkin. |
| **RNF** | Requisito No Funcional. En el sistema se representa como `story_type = 'NON_FUNCTIONAL'`. |
| **RF** | Requisito Funcional. `story_type = 'FUNCTIONAL'`. |
| **Escenario Gherkin** | Caso de prueba estructurado: Given / When / Then. Vinculado a una historia. |

## Enums del sistema

| Enum | Valores |
|------|---------|
| `Role` | `ADMIN`, `SUPERVISOR`, `OPERATOR` |
| `UnitOfMeasure` | `KG`, `LB`, `UNIT`, `PACKAGE`, `LITER` |
| `ProductType` | `CONSUMER_GOOD`, `RAW_MATERIAL`, `INTERNAL_SUPPLY`, `SERVICE_ASSOCIATED` |
| `ProductStatus` | `DRAFT`, `ACTIVE`, `INACTIVE` |
| `MovementType` | `ENTRY`, `EXIT`, `WASTE`, `POSITIVE_ADJUSTMENT`, `NEGATIVE_ADJUSTMENT` |
| `PurchaseOrderStatus` | `DRAFT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED` |
| `AccountsPayableStatus` | `PENDING`, `PARTIALLY_PAID`, `PAID`, `CANCELLED` |
| `FinancialAccountType` | `CASH`, `BANK`, `DIGITAL_WALLET` |
| `FinancialAccountStatus` | `ACTIVE`, `INACTIVE` |
| `FinancialMovementType` | `INCOME`, `EXPENSE` |
| `SprintStatus` | `PLANNING`, `ACTIVE`, `COMPLETED` |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` |
| `TaskType` | `DEV`, `QA`, `PLANNING`, `INFRA`, `DESIGN` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `TaskAssignee` | `MANUEL`, `ISKIAN` |
| `PromptCategory` | `NEW_FEATURE`, `BUG_FIX`, `REFACTOR`, `DOCUMENTATION`, `TESTING`, `DATABASE`, `CONFIGURATION` |
| `PromptStatus` | `DRAFT`, `READY`, `USED`, `ARCHIVED` |
| `StoryType` | `FUNCTIONAL`, `NON_FUNCTIONAL` |
| `StoryStatus` | `DEFINED`, `IN_DEV`, `REVIEW`, `DONE`, `BLOCKED` |
| `NfrCategory` | `DATA_INTEGRITY`, `CONSISTENCY`, `BUSINESS_RULES`, `SECURITY`, `PERFORMANCE`, `USABILITY`, `COMPLIANCE` |
| `ScenarioType` | `HAPPY_PATH`, `NEGATIVE`, `EDGE` |
