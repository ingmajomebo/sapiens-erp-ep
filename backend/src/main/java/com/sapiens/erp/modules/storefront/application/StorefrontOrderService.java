package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.domain.*;
import com.sapiens.erp.modules.storefront.domain.exception.StorefrontOutOfStockException;
import com.sapiens.erp.modules.storefront.infrastructure.StorefrontTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Pedidos del canal público.
 * <p>
 * Verifica stock al crear el pedido y lo rechaza con 422 si no alcanza, pero
 * NO registra el movimiento de salida: el inventario se descuenta cuando el
 * pedido se confirma desde el ERP. Así un carrito abandonado no congela
 * mercancía y se respeta el invariante de que el stock solo se mueve por
 * movimientos explícitos.
 */
@Service
@RequiredArgsConstructor
public class StorefrontOrderService {

    private final StorefrontProductRepository storefrontProductRepository;
    private final StorefrontAccountRepository accountRepository;
    private final InventoryMovementRepository movementRepository;
    private final CustomerRepository customerRepository;
    private final SalesOrderRepository orderRepository;
    private final StorefrontTokenService tokenService;
    private final StorefrontShipping shipping;

    @Transactional
    public OrderResultResponse createOrder(CreateOrderRequest req, UUID accountId) {
        // Honeypot: si viene relleno es un bot. Se responde 200 sin crear nada.
        if (req.website() != null && !req.website().isBlank()) {
            return new OrderResultResponse("EP-000000", tokenService.generateTrackingToken(),
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "RECEIVED");
        }

        List<ResolvedItem> items = resolveAndValidate(req.items());
        BigDecimal subtotal = items.stream()
                .map(ResolvedItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingCost = shipping.costFor(req.shipping().city(), subtotal);

        Customer customer = resolveCustomer(req, accountId);

        SalesOrder order = SalesOrder.create(
                nextOrderNumber(), customer, SalesChannel.PUBLIC, null, null,
                req.shipping().notes(), DeliveryMethod.DELIVERY, req.shipping().address());

        order.setTrackingToken(tokenService.generateTrackingToken());
        order.setDeliveryCity(req.shipping().city());
        order.setContactPhone(req.customer().phone());
        order.setContactEmail(req.customer().email());
        order.setShippingCost(shippingCost);
        order.setPaymentMethod(req.paymentMethod().name());

        for (ResolvedItem item : items) {
            order.addLine(SalesOrderLine.create(item.product(), item.quantity()));
        }

        SalesOrder saved = orderRepository.save(order);

        return new OrderResultResponse(
                saved.getOrderNumber(),
                saved.getTrackingToken(),
                subtotal,
                shippingCost,
                subtotal.add(shippingCost),
                mapStatus(saved.getStatus())
        );
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse track(String trackingToken) {
        SalesOrder order = orderRepository
                .findByTrackingTokenAndDeletedAtIsNull(trackingToken)
                .orElseThrow(() -> new IllegalArgumentException("No encontramos ese pedido"));
        return toStatus(order);
    }

    @Transactional(readOnly = true)
    public List<OrderStatusResponse> listForAccount(UUID accountId) {
        StorefrontAccount account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));
        if (account.getCustomer() == null) return List.of();
        return orderRepository
                .findAllByCustomerIdAndDeletedAtIsNullOrderByCreatedAtDesc(account.getCustomer().getId())
                .stream().map(this::toStatus).toList();
    }

    /* ── Validación ──────────────────────────────────────────────────────── */

    private record ResolvedItem(Product product, StorefrontProduct entry, BigDecimal quantity) {
        BigDecimal lineTotal() {
            return product.getSalePrice().multiply(quantity);
        }
    }

    private List<ResolvedItem> resolveAndValidate(List<OrderItemRequest> requested) {
        List<ResolvedItem> resolved = new ArrayList<>();
        for (OrderItemRequest item : requested) {
            StorefrontProduct entry = storefrontProductRepository.findById(item.presentationId())
                    .filter(sp -> sp.getDeletedAt() == null && sp.isPublished())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Esa presentación ya no está disponible"));

            Product product = entry.getProduct();
            if (!product.isActive() || product.getSalePrice() == null) {
                throw new IllegalArgumentException("Esa presentación ya no está disponible");
            }

            BigDecimal available = movementRepository.calculateCurrentStock(product.getId());
            if (available.compareTo(item.quantity()) < 0) {
                throw new StorefrontOutOfStockException(
                        product.getId(), entry.getGroupName(), entry.variantName(),
                        available, item.quantity());
            }
            resolved.add(new ResolvedItem(product, entry, item.quantity()));
        }
        return resolved;
    }

    /**
     * Reconoce al cliente que vuelve. Con cuenta, usa la suya; sin cuenta,
     * busca por teléfono antes de crear otro registro, para no fragmentar
     * el historial comercial del mismo hogar.
     */
    private Customer resolveCustomer(CreateOrderRequest req, UUID accountId) {
        if (accountId != null) {
            StorefrontAccount account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
                    .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));
            if (account.getCustomer() != null) {
                return updateContactData(account.getCustomer(), req);
            }
            Customer created = customerRepository.save(newCustomer(req, false));
            account.setCustomer(created);
            accountRepository.save(account);
            return created;
        }

        return customerRepository
                .findFirstByPhoneAndDeletedAtIsNull(req.customer().phone().trim())
                .map(existing -> updateContactData(existing, req))
                .orElseGet(() -> customerRepository.save(newCustomer(req, true)));
    }

    private Customer newCustomer(CreateOrderRequest req, boolean anonymous) {
        Customer c = Customer.anonymous(
                req.customer().fullName(), req.customer().email(), req.customer().phone());
        c.setAnonymous(anonymous);
        c.setAddress(req.shipping().address());
        c.setCity(req.shipping().city());
        c.setDocumentNumber(req.customer().document());
        return c;
    }

    /** La última dirección usada es la buena para el próximo despacho. */
    private Customer updateContactData(Customer customer, CreateOrderRequest req) {
        customer.setAddress(req.shipping().address());
        customer.setCity(req.shipping().city());
        if (req.customer().email() != null && !req.customer().email().isBlank()) {
            customer.setEmail(req.customer().email());
        }
        return customerRepository.save(customer);
    }

    /* ── Mapeo ───────────────────────────────────────────────────────────── */

    private OrderStatusResponse toStatus(SalesOrder order) {
        List<OrderLineResponse> lines = order.getLines().stream()
                .filter(l -> l.getDeletedAt() == null)
                .map(l -> new OrderLineResponse(
                        l.getProduct().getName(),
                        presentationNameOf(l.getProduct().getId()),
                        l.getQuantity(),
                        l.getUnitPrice(),
                        l.lineTotal()))
                .toList();

        BigDecimal subtotal = lines.stream()
                .map(OrderLineResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingCost = order.getShippingCost() != null
                ? order.getShippingCost() : BigDecimal.ZERO;

        return new OrderStatusResponse(
                order.getOrderNumber(),
                mapStatus(order.getStatus()),
                order.getCreatedAt(),
                order.getCustomer() != null ? order.getCustomer().getName() : "Cliente",
                order.getDeliveryCity(),
                order.getPaymentMethod(),
                lines,
                subtotal,
                shippingCost,
                subtotal.add(shippingCost),
                order.getCancelReason()
        );
    }

    private String presentationNameOf(UUID productId) {
        return storefrontProductRepository.findById(productId)
                .map(StorefrontProduct::variantName)
                .orElse("");
    }

    /**
     * El ERP tiene cuatro estados; la tienda muestra esos mismos.
     * PENDING se presenta como "Recibido", que es lo que significa para
     * el cliente: su pedido entró y está a la espera de confirmación.
     */
    private String mapStatus(SalesOrderStatus status) {
        return switch (status) {
            case PENDING -> "RECEIVED";
            case PREPARING -> "PREPARING";
            case DISPATCHED -> "DISPATCHED";
            case DELIVERED -> "DELIVERED";
            case CANCELLED -> "CANCELLED";
        };
    }

    private String nextOrderNumber() {
        return String.format("EP-%06d", orderRepository.nextOrderNumberValue());
    }
}
