# Catalog — Visión General

## Objetivo

Gestiona el catálogo maestro de productos y categorías. Es el contexto base del que dependen Inventory, Procurement y Finance.

## Responsabilidades

- CRUD de productos con validaciones de unicidad (nombre, SKU)
- CRUD de categorías
- Auto-generación de SKU (`PRO-000001`) mediante secuencia PostgreSQL
- Cálculo y actualización del costo promedio ponderado (delegado por Inventory)
- Importación masiva de productos desde JSON (bulk import)
- Gestión de múltiples estados de producto: DRAFT, ACTIVE, INACTIVE

## Dependencias con otros módulos

- **Ninguna dependencia de entrada** — es un módulo fundacional
- **Dependencias de salida**: Inventory, Procurement y Finance referencian `Product`

## Casos de uso principales

1. Administrador crea un producto nuevo con SKU automático
2. Supervisor importa 50 productos desde un Excel exportado a JSON
3. Operador busca un producto por nombre, SKU o código de barras
4. Sistema actualiza el costo promedio ponderado del producto al recibir una OC

## Flujo de creación de producto

```mermaid
flowchart LR
    A[Request: ProductRequest] --> B{¿nombre duplicado?}
    B -- Sí --> C[409 CONFLICT]
    B -- No --> D{¿SKU en request?}
    D -- No --> E[Generar PRO-XXXXXX]
    D -- Sí --> F{¿SKU duplicado?}
    F -- Sí --> C
    F -- No --> G[Usar SKU del request]
    E --> H[product.create()]
    G --> H
    H --> I[productRepository.save()]
    I --> J[201 Created + ProductResponse]
```
