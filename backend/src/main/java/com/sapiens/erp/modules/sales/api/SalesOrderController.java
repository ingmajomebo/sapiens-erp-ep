package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.*;
import com.sapiens.erp.modules.sales.application.CustomerService;
import com.sapiens.erp.modules.sales.application.SalesOrderLinkService;
import com.sapiens.erp.modules.sales.application.SalesOrderService;
import com.sapiens.erp.modules.sales.domain.SalesOrderStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SalesOrderController {

    private final SalesOrderService salesOrderService;
    private final SalesOrderLinkService linkService;
    private final CustomerService customerService;

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
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateRequest request) {
        OrderResponse response = salesOrderService.createAdmin(request);
        return ResponseEntity
                .created(URI.create("/api/v1/sales-orders/" + response.id()))
                .body(response);
    }

    @PatchMapping("/sales-orders/{id}/status")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable UUID id,
                                                      @RequestParam String status) {
        return ResponseEntity.ok(salesOrderService.updateStatus(id, SalesOrderStatus.valueOf(status)));
    }

    // ── Clientes ──────────────────────────────────────────────────────────────

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerResponse>> listCustomers() {
        return ResponseEntity.ok(customerService.listAll());
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    // ── Enlaces públicos (administración: los gestiona la empresa) ────────────

    @GetMapping("/sales-order-links")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<LinkResponse>> listLinks() {
        return ResponseEntity.ok(linkService.listAll());
    }

    @PostMapping("/sales-order-links")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<LinkResponse> createLink(@RequestBody LinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(linkService.create(request));
    }

    @PatchMapping("/sales-order-links/{id}/toggle")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<LinkResponse> toggleLink(@PathVariable UUID id) {
        return ResponseEntity.ok(linkService.toggle(id));
    }
}
