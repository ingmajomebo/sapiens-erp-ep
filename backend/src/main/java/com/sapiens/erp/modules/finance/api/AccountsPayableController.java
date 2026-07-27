package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.AccountsPayableResponse;
import com.sapiens.erp.modules.finance.api.dto.PaymentRequest;
import com.sapiens.erp.modules.finance.api.dto.SupplierPaymentResponse;
import com.sapiens.erp.modules.finance.application.AccountsPayableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts-payable")
@RequiredArgsConstructor
public class AccountsPayableController {

    private final AccountsPayableService service;

    @GetMapping
    public ResponseEntity<List<AccountsPayableResponse>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AccountsPayableResponse>> listPending() {
        return ResponseEntity.ok(service.listPending());
    }

    @GetMapping("/by-purchase-order/{poId}")
    public ResponseEntity<AccountsPayableResponse> getByPurchaseOrder(@PathVariable UUID poId) {
        return ResponseEntity.ok(service.getByPurchaseOrderId(poId));
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<List<SupplierPaymentResponse>> getPayments(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getPaymentHistory(id));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('FINANCE_PAYMENT_REGISTER')")
    public ResponseEntity<AccountsPayableResponse> registerPayment(
            @PathVariable UUID id,
            @Valid @RequestBody PaymentRequest req) {
        return ResponseEntity.ok(service.registerPayment(id, req));
    }
}
