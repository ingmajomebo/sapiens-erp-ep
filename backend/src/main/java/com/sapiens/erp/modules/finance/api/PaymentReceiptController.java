package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.PaymentReceiptRequest;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.PaymentReceiptResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.VoidRequest;
import com.sapiens.erp.modules.finance.application.PaymentReceiptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Recibos de Caja: creación con aplicaciones multi-factura y anulación auditable. */
@RestController
@RequestMapping("/api/v1/payment-receipts")
@RequiredArgsConstructor
public class PaymentReceiptController {

    private final PaymentReceiptService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<PaymentReceiptResponse> create(@Valid @RequestBody PaymentReceiptRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<PaymentReceiptResponse> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<PaymentReceiptResponse> voidReceipt(@PathVariable UUID id,
                                                              @Valid @RequestBody VoidRequest request) {
        return ResponseEntity.ok(service.voidReceipt(id, request.reason()));
    }
}
