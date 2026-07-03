package com.sapiens.erp.modules.sales.domain;

import java.util.Map;
import java.util.Set;

/**
 * Ciclo operativo del pedido:
 * PENDING (pendiente) → PREPARING (en preparación) → DISPATCHED (en despacho:
 * listo para recoger o en camino con el domiciliario) → DELIVERED (entregado).
 * Cancelable con novedad en cualquier punto antes de la entrega.
 */
public enum SalesOrderStatus {
    PENDING,
    PREPARING,
    DISPATCHED,
    DELIVERED,
    CANCELLED;

    private static final Map<SalesOrderStatus, Set<SalesOrderStatus>> TRANSITIONS = Map.of(
            PENDING,    Set.of(PREPARING, CANCELLED),
            PREPARING,  Set.of(DISPATCHED, CANCELLED),
            DISPATCHED, Set.of(DELIVERED, CANCELLED),
            DELIVERED,  Set.of(),
            CANCELLED,  Set.of()
    );

    public boolean canTransitionTo(SalesOrderStatus target) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }
}
