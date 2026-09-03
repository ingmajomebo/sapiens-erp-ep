package com.sapiens.erp.modules.inventory.api;

import com.sapiens.erp.modules.inventory.api.dto.MovementResponse;
import com.sapiens.erp.modules.inventory.api.dto.TransformationDtos.*;
import com.sapiens.erp.modules.inventory.application.InventoryTransformationService;
import com.sapiens.erp.modules.inventory.domain.TransformationLineKind;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Transformaciones de inventario.
 *
 * <p>Se reutiliza el permiso {@code INVENTORY_ADJUSTMENT}: transformar mueve
 * existencias igual que un ajuste, y quien puede ajustar inventario puede
 * transformarlo. Crear un permiso nuevo obligaría a repartirlo a mano en todos
 * los roles antes de que el módulo sirviera de algo.
 */
@RestController
@RequestMapping("/api/v1/inventory/transformations")
@RequiredArgsConstructor
public class InventoryTransformationController {

    private final InventoryTransformationService service;

    @GetMapping
    public List<TransformationResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public TransformationResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    /** Los movimientos que generó el documento, para auditarlo. */
    @GetMapping("/{id}/movements")
    public List<MovementResponse> movements(@PathVariable UUID id) {
        return service.movementsOf(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INVENTORY_ADJUSTMENT')")
    public ResponseEntity<TransformationResponse> create(
            @Valid @RequestBody CreateTransformationRequest request,
            Authentication auth) {
        var body = service.createDraft(request.transformationDate(), request.warehouseId(),
                request.notes(), userOf(auth));
        return ResponseEntity.created(URI.create(
                "/api/v1/inventory/transformations/" + body.id())).body(body);
    }

    @PostMapping("/{id}/lines")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUSTMENT')")
    public TransformationResponse addLine(@PathVariable UUID id,
                                          @Valid @RequestBody AddLineRequest request) {
        service.addLine(id, request.side(),
                request.lineKind() != null ? request.lineKind() : TransformationLineKind.PRODUCT,
                request.productId(), request.quantity());
        return service.get(id);
    }

    @DeleteMapping("/{id}/lines/{lineId}")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUSTMENT')")
    public TransformationResponse removeLine(@PathVariable UUID id, @PathVariable UUID lineId) {
        service.removeLine(id, lineId);
        return service.get(id);
    }

    /**
     * Genera todos los movimientos. Todo o nada: si algo falla no queda
     * inventario a medias ni documento confirmado a medias.
     */
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUSTMENT')")
    public TransformationResponse confirm(@PathVariable UUID id, Authentication auth) {
        return service.confirm(id, userOf(auth));
    }

    /** Revierte con movimientos inversos. No borra: el documento se conserva. */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('INVENTORY_ADJUSTMENT')")
    public TransformationResponse cancel(@PathVariable UUID id,
                                         @Valid @RequestBody CancelRequest request,
                                         Authentication auth) {
        return service.cancel(id, request.reason(), userOf(auth));
    }

    private String userOf(Authentication auth) {
        return auth != null ? auth.getName() : "sistema";
    }
}
