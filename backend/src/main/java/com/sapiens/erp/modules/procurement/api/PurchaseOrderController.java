package com.sapiens.erp.modules.procurement.api;

import com.sapiens.erp.modules.procurement.api.dto.PurchaseOrderRequest;
import com.sapiens.erp.modules.procurement.api.dto.PurchaseOrderResponse;
import com.sapiens.erp.modules.procurement.api.dto.PurchaseReceiptResponse;
import com.sapiens.erp.modules.procurement.api.dto.ReceiveRequest;
import com.sapiens.erp.modules.procurement.application.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public ResponseEntity<List<PurchaseOrderResponse>> listAll() {
        return ResponseEntity.ok(purchaseOrderService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(purchaseOrderService.getById(id));
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<PurchaseReceiptResponse> getReceipt(@PathVariable UUID id) {
        return ResponseEntity.ok(purchaseOrderService.getReceipt(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PROCUREMENT_ORDER_CREATE')")
    public ResponseEntity<PurchaseOrderResponse> create(@Valid @RequestBody PurchaseOrderRequest req) {
        PurchaseOrderResponse created = purchaseOrderService.create(req);
        return ResponseEntity
                .created(URI.create("/api/v1/purchase-orders/" + created.id()))
                .body(created);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('PROCUREMENT_ORDER_APPROVE')")
    public ResponseEntity<PurchaseOrderResponse> confirm(@PathVariable UUID id) {
        return ResponseEntity.ok(purchaseOrderService.confirm(id));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAuthority('PROCUREMENT_RECEIVE')")
    public ResponseEntity<PurchaseOrderResponse> receive(
            @PathVariable UUID id,
            @Valid @RequestBody ReceiveRequest req) {
        return ResponseEntity.ok(purchaseOrderService.receive(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PROCUREMENT_ORDER_APPROVE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        purchaseOrderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
