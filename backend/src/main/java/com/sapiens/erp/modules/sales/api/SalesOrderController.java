package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.api.dto.SalesInvoiceDtos.*;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.*;
import com.sapiens.erp.modules.sales.application.CustomerService;
import com.sapiens.erp.modules.sales.application.SalesInvoiceService;
import com.sapiens.erp.modules.sales.application.SalesOrderLinkService;
import com.sapiens.erp.modules.sales.application.SalesOrderService;
import com.sapiens.erp.modules.sales.application.SalesInvoicePdfService;
import com.sapiens.erp.modules.sales.domain.InvoicePaymentMethod;
import com.sapiens.erp.modules.sales.domain.SalesOrderStatus;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceStatus;
import com.sapiens.erp.shared.api.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SalesOrderController {

    private final SalesOrderService salesOrderService;
    private final SalesOrderLinkService linkService;
    private final CustomerService customerService;
    private final SalesInvoiceService invoiceService;
    private final SalesInvoicePdfService pdfService;
    private final com.sapiens.erp.modules.finance.application.PaymentReceiptService paymentReceiptService;

    // ── Pedidos (canal administrativo) ────────────────────────────────────────

    @GetMapping("/sales-orders")
    public ResponseEntity<List<OrderResponse>> list(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(salesOrderService.listFiltered(status));
    }

    @GetMapping("/sales-orders/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(salesOrderService.findById(id));
    }

    @PostMapping("/sales-orders")
    @PreAuthorize("hasAuthority('SALES_ORDER_CREATE')")
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateRequest request) {
        OrderResponse response = salesOrderService.createAdmin(request);
        return ResponseEntity
                .created(URI.create("/api/v1/sales-orders/" + response.id()))
                .body(response);
    }

    @PatchMapping("/sales-orders/{id}/status")
    @PreAuthorize("hasAuthority('SALES_ORDER_CREATE')")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable UUID id,
                                                      @RequestParam String status) {
        return ResponseEntity.ok(salesOrderService.updateStatus(id, SalesOrderStatus.valueOf(status)));
    }

    @PatchMapping("/sales-orders/{id}/cancel")
    @PreAuthorize("hasAuthority('SALES_ORDER_CREATE')")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable UUID id,
                                                     @Valid @RequestBody CancelRequest request) {
        return ResponseEntity.ok(salesOrderService.cancel(id, request.reason()));
    }

    // ── Facturación de ventas ─────────────────────────────────────────────────

    /** Genera la factura del pedido en estado BORRADOR (se emite después). */
    @PostMapping("/sales-orders/{id}/invoice")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<InvoiceListResponse> createInvoiceDraft(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createDraftForOrder(id));
    }

    @GetMapping("/sales-invoices")
    public ResponseEntity<List<InvoiceListResponse>> listInvoices(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(invoiceService.listFiltered(status));
    }

    @GetMapping("/sales-invoices/{id}")
    public ResponseEntity<InvoiceDetailResponse> invoiceDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getDetail(id));
    }

    /** Filtros combinables con paginación y ordenamiento (whitelist de columnas). */
    @GetMapping("/sales-invoices/search")
    public ResponseEntity<PagedResponse<InvoiceListResponse>> searchInvoices(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<SalesInvoiceStatus> statuses,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BigDecimal minTotal,
            @RequestParam(required = false) BigDecimal maxTotal,
            @RequestParam(defaultValue = "false") boolean overdueOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortField,
            @RequestParam(defaultValue = "desc") String sortDir) {
        var params = new SalesInvoiceService.SearchParams(q, statuses, customerId, from, to,
                minTotal, maxTotal, overdueOnly);
        return ResponseEntity.ok(invoiceService.search(params, page, size, sortField, sortDir));
    }

    /** KPIs que reflejan los mismos filtros de la búsqueda. */
    @GetMapping("/sales-invoices/summary")
    public ResponseEntity<SalesInvoiceService.Summary> invoiceSummary(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<SalesInvoiceStatus> statuses,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BigDecimal minTotal,
            @RequestParam(required = false) BigDecimal maxTotal,
            @RequestParam(defaultValue = "false") boolean overdueOnly) {
        var params = new SalesInvoiceService.SearchParams(q, statuses, customerId, from, to,
                minTotal, maxTotal, overdueOnly);
        return ResponseEntity.ok(invoiceService.summary(params));
    }

    @PatchMapping("/sales-invoices/{id}/emit")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<InvoiceListResponse> emitInvoice(@PathVariable UUID id,
                                                           @Valid @RequestBody EmitRequest request) {
        return ResponseEntity.ok(invoiceService.emit(id, request));
    }

    /** Registra un abono: crea un recibo de caja (RC) aplicado a la CxC de la factura. */
    @PostMapping("/sales-invoices/{id}/payments")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<InvoiceListResponse> registerPayment(@PathVariable UUID id,
                                                               @Valid @RequestBody PaymentRequest request) {
        paymentReceiptService.payInvoice(id, request.amount(), request.paymentMethod(),
                request.financialAccountId(), request.reference());
        return ResponseEntity.ok(invoiceService.listResponse(id));
    }

    /** Compatibilidad con el flujo simple: paga el saldo completo en efectivo (también genera RC). */
    @PatchMapping("/sales-invoices/{id}/pay")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<InvoiceListResponse> payInvoice(@PathVariable UUID id) {
        paymentReceiptService.payInvoice(id, null, InvoicePaymentMethod.CASH, null, null);
        return ResponseEntity.ok(invoiceService.listResponse(id));
    }

    @PatchMapping("/sales-invoices/{id}/cancel")
    @PreAuthorize("hasAuthority('SALES_INVOICE_MANAGE')")
    public ResponseEntity<InvoiceListResponse> cancelInvoice(@PathVariable UUID id,
                                                             @Valid @RequestBody CancelRequest request) {
        return ResponseEntity.ok(invoiceService.cancel(id, request.reason()));
    }

    // ── PDF (representación gráfica) ──────────────────────────────────────────

    @GetMapping("/sales-invoices/{id}/pdf")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable UUID id) {
        byte[] pdf = pdfService.invoicePdf(id);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"factura-" + id + ".pdf\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/credit-notes/{id}/pdf")
    public ResponseEntity<byte[]> creditNotePdf(@PathVariable UUID id) {
        byte[] pdf = pdfService.creditNotePdf(id);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"nota-credito-" + id + ".pdf\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ── Clientes ──────────────────────────────────────────────────────────────

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerResponse>> listCustomers() {
        return ResponseEntity.ok(customerService.listAll());
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAuthority('SALES_CUSTOMER_MANAGE')")
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    // ── Enlaces públicos (administración: los gestiona la empresa) ────────────

    @GetMapping("/sales-order-links")
    @PreAuthorize("hasAuthority('SALES_ORDER_APPROVE')")
    public ResponseEntity<List<LinkResponse>> listLinks() {
        return ResponseEntity.ok(linkService.listAll());
    }

    @PostMapping("/sales-order-links")
    @PreAuthorize("hasAuthority('SALES_ORDER_APPROVE')")
    public ResponseEntity<LinkResponse> createLink(@RequestBody LinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(linkService.create(request));
    }

    @PatchMapping("/sales-order-links/{id}/toggle")
    @PreAuthorize("hasAuthority('SALES_ORDER_APPROVE')")
    public ResponseEntity<LinkResponse> toggleLink(@PathVariable UUID id) {
        return ResponseEntity.ok(linkService.toggle(id));
    }
}
