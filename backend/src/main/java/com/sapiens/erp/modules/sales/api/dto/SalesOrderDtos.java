package com.sapiens.erp.modules.sales.api.dto;

import com.sapiens.erp.modules.sales.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** DTOs del módulo de Ventas (REQ-VEN-001). Agrupados por cohesión, patrón record del proyecto. */
public final class SalesOrderDtos {

    private SalesOrderDtos() {}

    // ── Requests ──────────────────────────────────────────────────────────────

    public record LineRequest(
            @NotNull UUID productId,
            @NotNull @DecimalMin(value = "0", inclusive = false,
                    message = "La cantidad debe ser mayor a cero") BigDecimal quantity
    ) {}

    /** Canal administrativo: cliente existente (customerId) o anónimo (datos de contacto opcionales). */
    public record CreateRequest(
            UUID customerId,
            String contactName,
            String contactEmail,
            String contactPhone,
            String notes,
            @NotEmpty(message = "El pedido debe contener al menos una línea")
            List<@Valid LineRequest> lines
    ) {}

    /** Canal público: siempre anónimo o identificado por datos de contacto. */
    public record PublicCreateRequest(
            String contactName,
            String contactEmail,
            String contactPhone,
            String notes,
            @NotEmpty(message = "El pedido debe contener al menos una línea")
            List<@Valid LineRequest> lines
    ) {}

    public record CustomerRequest(
            @NotBlank String name,
            String email,
            String phone
    ) {}

    public record LinkRequest(String label) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    public record LineResponse(
            UUID productId,
            String productName,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {
        public static LineResponse from(SalesOrderLine l) {
            return new LineResponse(l.getProduct().getId(), l.getProductName(),
                    l.getQuantity(), l.getUnitPrice(), l.lineTotal());
        }
    }

    public record OrderResponse(
            UUID id,
            String orderNumber,
            UUID customerId,
            String customerName,
            boolean customerAnonymous,
            SalesChannel channel,
            SalesOrderStatus status,
            String createdBy,
            String notes,
            BigDecimal total,
            List<LineResponse> lines,
            Instant createdAt
    ) {
        public static OrderResponse from(SalesOrder so) {
            return new OrderResponse(
                    so.getId(), so.getOrderNumber(),
                    so.getCustomer() != null ? so.getCustomer().getId() : null,
                    so.getCustomer() != null ? so.getCustomer().getName() : "Cliente anónimo",
                    so.getCustomer() == null || so.getCustomer().isAnonymous(),
                    so.getChannel(), so.getStatus(), so.getCreatedBy(), so.getNotes(),
                    so.total(),
                    so.getLines().stream().filter(l -> l.getDeletedAt() == null)
                            .map(LineResponse::from).toList(),
                    so.getCreatedAt()
            );
        }
    }

    public record CustomerResponse(UUID id, String name, String email, String phone,
                                   boolean anonymous, Instant createdAt) {
        public static CustomerResponse from(Customer c) {
            return new CustomerResponse(c.getId(), c.getName(), c.getEmail(), c.getPhone(),
                    c.isAnonymous(), c.getCreatedAt());
        }
    }

    public record LinkResponse(UUID id, String token, String label, boolean active, Instant createdAt) {
        public static LinkResponse from(SalesOrderLink l) {
            return new LinkResponse(l.getId(), l.getToken(), l.getLabel(), l.isEnabled(), l.getCreatedAt());
        }
    }

    /** Catálogo que ve el cliente en el enlace público. */
    public record PublicProductResponse(UUID id, String name, String unitOfMeasure,
                                        BigDecimal salePrice, String imageUrl) {}

    public record PublicCatalogResponse(String label, List<PublicProductResponse> products) {}
}
