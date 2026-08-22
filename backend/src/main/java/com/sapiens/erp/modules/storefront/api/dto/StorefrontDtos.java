package com.sapiens.erp.modules.storefront.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Contrato de la tienda pública. La forma la define el storefront, no el ERP:
 * un "producto" de la tienda es un grupo, y cada "presentación" es un producto
 * real del ERP con su propio stock.
 */
public final class StorefrontDtos {

    private StorefrontDtos() {}

    /* ── Catálogo ────────────────────────────────────────────────────────── */

    public record CategoryResponse(String id, String name, String description) {}

    /** Una presentación vendible. El {@code id} es el id del producto del ERP. */
    public record PresentationResponse(
            UUID id,
            String name,
            String axisPresentation,
            String axisSize,
            BigDecimal price,
            boolean available
    ) {}

    public record ProductResponse(
            String slug,
            String name,
            String categoryId,
            String origin,
            String description,
            String conservation,
            String imageUrl,
            String imageAlt,
            List<PresentationResponse> presentations,
            boolean available,
            int webSortOrder
    ) {}

    public record CatalogResponse(List<CategoryResponse> categories, List<ProductResponse> products) {}

    /* ── Pedido ──────────────────────────────────────────────────────────── */

    public record OrderCustomerRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 40) String document,
            @NotBlank @Size(max = 40) String phone,
            @Email @Size(max = 160) String email
    ) {}

    public record OrderShippingRequest(
            @NotBlank @Size(max = 255) String address,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 500) String notes
    ) {}

    /** Solo identificadores y cantidades: el cliente nunca envía precios. */
    public record OrderItemRequest(
            @NotNull UUID presentationId,
            @NotNull @DecimalMin("0.001") BigDecimal quantity
    ) {}

    public record CreateOrderRequest(
            @NotNull @Valid OrderCustomerRequest customer,
            @NotNull @Valid OrderShippingRequest shipping,
            @NotNull PaymentMethod paymentMethod,
            @NotEmpty @Valid List<OrderItemRequest> items,
            /** Honeypot antispam: debe llegar vacío. */
            String website
    ) {}

    public enum PaymentMethod { CASH_ON_DELIVERY, BANK_TRANSFER }

    public record OrderResultResponse(
            String number,
            String trackingToken,
            BigDecimal subtotal,
            BigDecimal shippingCost,
            BigDecimal total,
            String status
    ) {}

    public record OrderLineResponse(
            String productName,
            String presentationName,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {}

    public record OrderStatusResponse(
            String number,
            String status,
            Instant placedAt,
            String customerName,
            String shippingCity,
            String paymentMethod,
            List<OrderLineResponse> lines,
            BigDecimal subtotal,
            BigDecimal shippingCost,
            BigDecimal total,
            String cancelReason
    ) {}

    /* ── Cuentas ─────────────────────────────────────────────────────────── */

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @Size(max = 40) String phone
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record AccountResponse(UUID id, String name, String email, String phone) {}

    public record SessionResponse(String token, AccountResponse account) {}

    /* ── Administración de la vitrina (panel del ERP) ─────────────────────── */

    /** Un producto del ERP con su estado de publicación en la tienda. */
    public record AdminProductRow(
            UUID productId,
            String productName,
            String sku,
            String categoryName,
            BigDecimal salePrice,
            BigDecimal currentStock,
            boolean published,
            String slug,
            String groupSlug,
            String groupName,
            String axisPresentation,
            String axisSize,
            String origin,
            String description,
            String conservation,
            Integer sortOrder
    ) {}

    public record PublishRequest(
            @NotBlank @Size(max = 120) String slug,
            @NotBlank @Size(max = 120) String groupSlug,
            @NotBlank @Size(max = 120) String groupName,
            @Size(max = 60) String axisPresentation,
            @NotBlank @Size(max = 60) String axisSize,
            @Size(max = 80) String origin,
            String description,
            String conservation,
            Integer sortOrder,
            boolean published
    ) {}
}
