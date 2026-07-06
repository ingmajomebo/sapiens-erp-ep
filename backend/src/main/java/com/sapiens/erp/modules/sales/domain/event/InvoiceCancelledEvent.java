package com.sapiens.erp.modules.sales.domain.event;

import java.util.UUID;

/** Se publica al anular una factura. Finance saca la CxC de cartera (CANCELLED). */
public record InvoiceCancelledEvent(UUID invoiceId) {}
