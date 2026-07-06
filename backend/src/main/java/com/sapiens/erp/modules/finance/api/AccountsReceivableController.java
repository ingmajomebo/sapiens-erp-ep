package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.AgingReportResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.AppliedReceiptResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ReceivableDetailResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ReceivableResponse;
import com.sapiens.erp.modules.finance.application.AccountsReceivableService;
import com.sapiens.erp.modules.finance.domain.AgingBucket;
import com.sapiens.erp.modules.finance.domain.ReceivableStatus;
import com.sapiens.erp.shared.api.PagedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Cuentas por Cobrar: cartera de clientes, historial de pagos y antigüedad. */
@RestController
@RequestMapping("/api/v1/accounts-receivable")
@RequiredArgsConstructor
public class AccountsReceivableController {

    private final AccountsReceivableService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<PagedResponse<ReceivableResponse>> list(
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) ReceivableStatus status,
            @RequestParam(required = false) AgingBucket agingBucket,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listFiltered(customerId, status, agingBucket, page, size));
    }

    @GetMapping("/aging")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<AgingReportResponse> aging() {
        return ResponseEntity.ok(service.aging());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ReceivableDetailResponse> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getDetail(id));
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<AppliedReceiptResponse>> payments(@PathVariable UUID id) {
        return ResponseEntity.ok(service.paymentsFor(id));
    }
}
