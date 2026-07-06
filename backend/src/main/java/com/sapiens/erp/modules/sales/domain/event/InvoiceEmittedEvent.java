package com.sapiens.erp.modules.sales.domain.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Se publica al emitir una factura. Finance lo escucha para abrir la CxC
 * (evento síncrono: corre dentro de la misma transacción del emit).
 */
public record InvoiceEmittedEvent(
        UUID invoiceId,
        String invoiceNumber,
        UUID customerId,      // null si la factura no tiene cliente identificado
        BigDecimal total,
        LocalDate dueDate
) {}
