# Sapiens ERP — Documentación Técnica

> Documentación generada desde el análisis del código fuente. Fecha: 2026-06-28.

## Índice

### Documentos raíz

| Archivo | Descripción |
|---------|-------------|
| [architecture.md](architecture.md) | Arquitectura general + diagrama Mermaid |
| [database.md](database.md) | Todas las tablas + historial Flyway |
| [api-overview.md](api-overview.md) | Lista completa de endpoints REST |
| [security.md](security.md) | JWT, roles, filtros Spring Security |
| [coding-standards.md](coding-standards.md) | Convenciones encontradas en el código |
| [glossary.md](glossary.md) | Glosario de términos del dominio |

### Módulos

| Módulo | Descripción |
|--------|-------------|
| [modules/identity/](modules/identity/) | Usuarios, autenticación JWT, roles |
| [modules/catalog/](modules/catalog/) | Productos, categorías, unidades de medida |
| [modules/inventory/](modules/inventory/) | Stock, movimientos, lotes, FIFO |
| [modules/procurement/](modules/procurement/) | Proveedores, órdenes de compra, recepciones |
| [modules/finance/](modules/finance/) | Cuentas por pagar, pagos, cuentas financieras |
| [modules/project/](modules/project/) | Sprints, tareas, prompts IA, historias de usuario |

### Transversal

| Archivo | Descripción |
|---------|-------------|
| [shared/authentication.md](shared/authentication.md) | Flujo de autenticación extremo a extremo |
| [shared/authorization.md](shared/authorization.md) | Roles y permisos por endpoint |
| [shared/common-components.md](shared/common-components.md) | Componentes React reutilizables |
