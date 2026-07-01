package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.FinancialAccountRequest;
import com.sapiens.erp.modules.finance.api.dto.FinancialAccountResponse;
import com.sapiens.erp.modules.finance.api.dto.FinancialMovementResponse;
import com.sapiens.erp.modules.finance.application.FinancialAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/financial-accounts")
@RequiredArgsConstructor
public class FinancialAccountController {

    private final FinancialAccountService service;

    @GetMapping
    public ResponseEntity<List<FinancialAccountResponse>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<FinancialAccountResponse> create(@Valid @RequestBody FinancialAccountRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<List<FinancialMovementResponse>> getMovements(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getMovements(id));
    }
}
