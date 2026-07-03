package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.CustomerDetailResponse;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.CustomerListItem;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.SegmentSummary;
import com.sapiens.erp.modules.sales.api.dto.CustomerDtos.UpsertRequest;
import com.sapiens.erp.modules.sales.application.CustomerService;
import com.sapiens.erp.modules.sales.domain.CustomerSegment;
import com.sapiens.erp.shared.api.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Módulo Clientes: búsqueda con métricas de compra, segmentación y ficha detallada. */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/search")
    public ResponseEntity<PagedResponse<CustomerListItem>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<CustomerSegment> segments,
            @RequestParam(required = false) Integer minDaysSinceLastPurchase,
            @RequestParam(defaultValue = "false") boolean pendingOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var params = new CustomerService.SearchParams(q, segments, minDaysSinceLastPurchase, pendingOnly);
        return ResponseEntity.ok(customerService.search(params, page, size));
    }

    @GetMapping("/summary")
    public ResponseEntity<SegmentSummary> summary() {
        return ResponseEntity.ok(customerService.summary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDetailResponse> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(customerService.getDetail(id));
    }

    @PostMapping("/full")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<CustomerListItem> create(@Valid @RequestBody UpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.createFull(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<CustomerListItem> update(@PathVariable UUID id,
                                                   @Valid @RequestBody UpsertRequest request) {
        return ResponseEntity.ok(customerService.update(id, request));
    }
}
