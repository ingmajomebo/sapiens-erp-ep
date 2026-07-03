package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.*;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.exception.SalesOrderNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SalesOrderService {

    private final SalesOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SalesInvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public List<OrderResponse> listFiltered(String statusStr) {
        SalesOrderStatus status = statusStr != null ? SalesOrderStatus.valueOf(statusStr) : null;
        List<SalesOrder> orders = orderRepository.findFiltered(status);

        // Factura activa por pedido en una sola consulta (sin N+1)
        Map<UUID, SalesInvoice> invoiceByOrder = new HashMap<>();
        if (!orders.isEmpty()) {
            List<UUID> ids = orders.stream().map(SalesOrder::getId).toList();
            for (SalesInvoice inv : invoiceRepository.findActiveByOrderIds(ids)) {
                invoiceByOrder.put(inv.getSalesOrder().getId(), inv);
            }
        }
        return orders.stream()
                .map(so -> OrderResponse.from(so, invoiceByOrder.get(so.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(UUID id) {
        SalesOrder order = orderRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SalesOrderNotFoundException(id));
        SalesInvoice invoice = invoiceRepository.findActiveByOrderIds(List.of(id)).stream()
                .findFirst().orElse(null);
        return OrderResponse.from(order, invoice);
    }

    /** Canal administrativo: el usuario autenticado queda registrado como creador. */
    @Transactional
    public OrderResponse createAdmin(CreateRequest req) {
        validateDelivery(req.deliveryMethod(), req.deliveryAddress());
        Customer customer = resolveCustomer(req.customerId(), req.contactName(),
                req.contactEmail(), req.contactPhone());
        SalesOrder order = SalesOrder.create(nextOrderNumber(), customer,
                SalesChannel.ADMIN, currentPrincipal(), null, req.notes(),
                req.deliveryMethod(), req.deliveryAddress());
        addValidatedLines(order, req.lines());
        return OrderResponse.from(orderRepository.save(order));
    }

    /** Canal público: mismo tipo de entidad y mismo estado inicial que el canal administrativo. */
    @Transactional
    public OrderResponse createPublic(SalesOrderLink link, PublicCreateRequest req) {
        validateDelivery(req.deliveryMethod(), req.deliveryAddress());
        Customer customer = customerRepository.save(
                Customer.anonymous(req.contactName(), req.contactEmail(), req.contactPhone()));
        SalesOrder order = SalesOrder.create(nextOrderNumber(), customer,
                SalesChannel.PUBLIC, null, link, req.notes(),
                req.deliveryMethod(), req.deliveryAddress());
        addValidatedLines(order, req.lines());
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse updateStatus(UUID id, SalesOrderStatus status) {
        if (status == SalesOrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Para cancelar usa el endpoint de cancelación con novedad");
        }
        SalesOrder order = orderRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SalesOrderNotFoundException(id));
        order.transitionTo(status);
        return OrderResponse.from(orderRepository.save(order));
    }

    /** Cancela el pedido registrando la novedad (obligatoria). */
    @Transactional
    public OrderResponse cancel(UUID id, String reason) {
        SalesOrder order = orderRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SalesOrderNotFoundException(id));
        order.cancel(reason.trim());
        return OrderResponse.from(orderRepository.save(order));
    }

    private void validateDelivery(DeliveryMethod method, String address) {
        if (method == DeliveryMethod.DELIVERY && (address == null || address.isBlank())) {
            throw new IllegalArgumentException("El envío a domicilio requiere una dirección de entrega");
        }
    }

    // ── Reglas de creación (REQ-VEN-001) ──────────────────────────────────────

    private void addValidatedLines(SalesOrder order, List<LineRequest> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("El pedido debe contener al menos una línea de producto");
        }
        for (LineRequest line : lines) {
            if (line.quantity() == null || line.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La cantidad de cada línea debe ser mayor a cero");
            }
            Product product = productRepository.findByIdAndDeletedAtIsNull(line.productId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "El producto no existe en el catálogo activo: " + line.productId()));
            order.addLine(SalesOrderLine.create(product, line.quantity()));
        }
        // Nota MVP: no se descuenta stock en la creación del pedido (pendiente de Gherkin)
    }

    private Customer resolveCustomer(UUID customerId, String contactName, String email, String phone) {
        if (customerId != null) {
            return customerRepository.findByIdAndDeletedAtIsNull(customerId)
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado: " + customerId));
        }
        return customerRepository.save(Customer.anonymous(contactName, email, phone));
    }

    private String nextOrderNumber() {
        return String.format("SO-%06d", orderRepository.nextOrderNumberValue());
    }

    /** Email del usuario autenticado (el principal JWT es el UUID; se resuelve vía identity). */
    private String currentPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        try {
            return userRepository.findById(UUID.fromString(auth.getName()))
                    .map(u -> u.getEmail())
                    .orElse(auth.getName());
        } catch (IllegalArgumentException notAUuid) {
            return auth.getName();
        }
    }
}
