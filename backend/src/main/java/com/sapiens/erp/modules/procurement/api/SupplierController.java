package com.sapiens.erp.modules.procurement.api;

import com.sapiens.erp.modules.procurement.api.dto.SupplierRequest;
import com.sapiens.erp.modules.procurement.api.dto.SupplierResponse;
import com.sapiens.erp.modules.procurement.application.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<List<SupplierResponse>> listAll() {
        return ResponseEntity.ok(supplierService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        SupplierResponse response = supplierService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/suppliers/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<SupplierResponse> update(@PathVariable UUID id,
                                                    @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
