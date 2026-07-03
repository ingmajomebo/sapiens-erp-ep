package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.InvoiceResponse;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.exception.SalesOrderNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Facturas de venta: se emiten desde un pedido y se marcan pagadas o canceladas. */
@Service
@RequiredArgsConstructor
public class SalesInvoiceService {

    private final SalesInvoiceRepository invoiceRepository;
    private final SalesOrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listFiltered(String statusStr) {
        SalesInvoiceStatus status = statusStr != null ? SalesInvoiceStatus.valueOf(statusStr) : null;
        return invoiceRepository.findFiltered(status).stream()
                .map(InvoiceResponse::from)
                .toList();
    }

    @Transactional
    public InvoiceResponse issueForOrder(UUID orderId) {
        SalesOrder order = orderRepository.findByIdAndDeletedAtIsNull(orderId)
                .orElseThrow(() -> new SalesOrderNotFoundException(orderId));
        if (order.getStatus() == SalesOrderStatus.CANCELLED) {
            throw new IllegalArgumentException("No se puede facturar un pedido cancelado");
        }
        if (!invoiceRepository.findActiveByOrderIds(List.of(orderId)).isEmpty()) {
            throw new IllegalArgumentException("El pedido " + order.getOrderNumber() + " ya tiene una factura activa");
        }
        SalesInvoice invoice = SalesInvoice.issue(nextInvoiceNumber(), order);
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceResponse markPaid(UUID id) {
        SalesInvoice invoice = findActive(id);
        invoice.markPaid();
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceResponse cancel(UUID id, String reason) {
        SalesInvoice invoice = findActive(id);
        invoice.cancel(reason.trim());
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    private SalesInvoice findActive(UUID id) {
        return invoiceRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Factura no encontrada: " + id));
    }

    private String nextInvoiceNumber() {
        return String.format("FV-%06d", invoiceRepository.nextInvoiceNumberValue());
    }
}
