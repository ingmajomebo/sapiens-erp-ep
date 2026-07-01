package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.ExpenseRequest;
import com.sapiens.erp.modules.finance.api.dto.ExpenseResponse;
import com.sapiens.erp.modules.finance.application.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService service;

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(@Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponse> update(@PathVariable UUID id,
                                                  @Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
