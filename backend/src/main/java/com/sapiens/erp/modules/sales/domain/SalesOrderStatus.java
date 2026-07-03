package com.sapiens.erp.modules.sales.domain;

import java.util.Map;
import java.util.Set;

/**
 * Ciclo mínimo del MVP (pendiente de Gherkin formal — adoptado del prototipo existente):
 * PENDING → CONFIRMED → DELIVERED, con cancelación posible antes de entregar.
 */
public enum SalesOrderStatus {
    PENDING,
    CONFIRMED,
    DELIVERED,
    CANCELLED;

    private static final Map<SalesOrderStatus, Set<SalesOrderStatus>> TRANSITIONS = Map.of(
            PENDING,   Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(DELIVERED, CANCELLED),
            DELIVERED, Set.of(),
            CANCELLED, Set.of()
    );

    public boolean canTransitionTo(SalesOrderStatus target) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }
}
