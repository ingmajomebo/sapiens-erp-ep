package com.sapiens.erp.modules.inventory.api;

import com.sapiens.erp.modules.inventory.api.dto.*;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    // ── Stock ─────────────────────────────────────────────────────────────────

    @GetMapping("/stock")
    public Page<StockResponse> listStock(
            @PageableDefault(size = 50, sort = "id") Pageable pageable) {
        return inventoryService.listStock(pageable);
    }

    @GetMapping("/stock/{productId}")
    public StockResponse getStock(@PathVariable UUID productId) {
        return inventoryService.getStock(productId);
    }

    // ── Lots ──────────────────────────────────────────────────────────────────

    @GetMapping("/lots/{productId}")
    public List<LotResponse> getLots(@PathVariable UUID productId) {
        return inventoryService.getLots(productId);
    }

    @GetMapping("/lots/expiring")
    public List<LotResponse> getExpiringLots(@RequestParam(defaultValue = "3") int days) {
        return inventoryService.getExpiringLots(days);
    }

    // ── Movements ─────────────────────────────────────────────────────────────

    @GetMapping("/movements")
    public Page<MovementResponse> getMovements(
            @RequestParam(required = false) UUID productId,
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return inventoryService.getMovements(productId, pageable);
    }

    // ── Write operations ──────────────────────────────────────────────────────

    @PostMapping("/entries")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<MovementResponse> registerEntry(@Valid @RequestBody EntryRequest request) {
        MovementResponse response = inventoryService.registerEntry(request);
        return ResponseEntity
                .created(URI.create("/api/v1/inventory/movements/" + response.id()))
                .body(response);
    }

    @PostMapping("/exits")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<MovementResponse> registerExit(@Valid @RequestBody ExitRequest request) {
        MovementResponse response = inventoryService.registerExit(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/wastes")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<MovementResponse> registerWaste(@Valid @RequestBody WasteRequest request) {
        MovementResponse response = inventoryService.registerWaste(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/adjustments")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<MovementResponse> registerAdjustment(@Valid @RequestBody AdjustmentRequest request) {
        MovementResponse response = inventoryService.registerAdjustment(request);
        return ResponseEntity.ok(response);
    }
}
