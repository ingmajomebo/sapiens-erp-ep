package com.sapiens.erp.modules.inventory.api.dto;

import com.sapiens.erp.modules.inventory.domain.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Contrato de las transformaciones de inventario.
 *
 * <p>Los nombres dicen qué le pasa al INVENTARIO, nunca "entrada" y "salida" a
 * secas: leído desde el documento significan lo contrario que leído desde la
 * bodega, y esa ambigüedad hace que alguien capture la materia prima donde van
 * los productos terminados.
 */
public final class TransformationDtos {

    private TransformationDtos() {}

    /* ── Peticiones ──────────────────────────────────────────────────────── */

    public record CreateTransformationRequest(
            LocalDate transformationDate,
            UUID warehouseId,
            @Size(max = 2000) String notes
    ) {}

    public record AddLineRequest(
            @NotNull TransformationSide side,
            TransformationLineKind lineKind,
            @NotNull UUID productId,
            @NotNull @DecimalMin(value = "0", inclusive = false,
                    message = "La cantidad debe ser mayor que cero") BigDecimal quantity
    ) {}

    public record CancelRequest(
            @NotBlank(message = "La anulación exige un motivo") @Size(max = 500) String reason
    ) {}

    /* ── Respuestas ──────────────────────────────────────────────────────── */

    public record LineResponse(
            UUID id,
            String side,
            String lineKind,
            UUID productId,
            /** Copiados al capturar: no se leen del producto al mostrar. */
            String productCode,
            String productName,
            BigDecimal quantity,
            String unit,
            BigDecimal baseQuantity,
            UUID lotId,
            BigDecimal unitCost,
            BigDecimal totalCost,
            BigDecimal referenceSalePrice,
            BigDecimal saleValue,
            BigDecimal allocationWeight,
            BigDecimal allocatedCost,
            BigDecimal resultingUnitCost,
            String costingStatus
    ) {
        public static LineResponse of(InventoryTransformationLine l) {
            return new LineResponse(
                    l.getId(), l.getSide().name(), l.getLineKind().name(),
                    l.getProduct().getId(), l.getProductCode(), l.getProductName(),
                    l.getQuantity(), l.getUnit().name(), l.getBaseQuantity(), l.getLotId(),
                    l.getUnitCost(), l.getTotalCost(),
                    l.getReferenceSalePrice(), l.getSaleValue(), l.getAllocationWeight(),
                    l.getAllocatedCost(), l.getResultingUnitCost(),
                    l.getCostingStatus().name());
        }
    }

    /** Advertencia que informa pero NO impide confirmar. */
    public record WarningResponse(String code, String message) {}

    public record TransformationResponse(
            UUID id,
            String number,
            LocalDate transformationDate,
            String status,
            UUID warehouseId,
            String warehouseName,
            String notes,
            String createdBy,
            Instant createdAt,
            String confirmedBy,
            Instant confirmedAt,
            String cancelledBy,
            Instant cancelledAt,
            String cancelReason,
            BigDecimal inputTotalCost,
            String costingStatus,
            BigDecimal yieldPercentage,
            BigDecimal wastePercentage,
            /** Null cuando las unidades no son convertibles entre sí. */
            boolean yieldCalculable,
            List<LineResponse> consumed,
            List<LineResponse> obtained,
            List<WarningResponse> warnings,
            /**
             * Se repite en cada respuesta a propósito: este reparto produce el
             * mismo margen en todos los productos por diseño y no sirve para
             * comparar rentabilidad entre ellos.
             */
            String costMethodNotice
    ) {}
}
