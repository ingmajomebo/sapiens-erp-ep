package com.sapiens.erp.modules.sales;

import com.sapiens.erp.modules.sales.application.CustomerMetricsService;
import com.sapiens.erp.modules.sales.domain.CustomerSegment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Reglas de segmentación con los umbrales por defecto:
 * new-max-purchases=1, at-risk-days=30, inactive-days=90.
 */
class CustomerSegmentationTest {

    private static final int NEW_MAX = 1;
    private static final int AT_RISK = 30;
    private static final int INACTIVE = 90;

    private CustomerSegment segment(long purchases, Long daysSince) {
        return CustomerMetricsService.segmentFor(purchases, daysSince, NEW_MAX, AT_RISK, INACTIVE);
    }

    @Test
    @DisplayName("Sin compras → NUEVO")
    void noPurchasesIsNew() {
        assertEquals(CustomerSegment.NEW, segment(0, null));
    }

    @Test
    @DisplayName("Una compra reciente → NUEVO")
    void singleRecentPurchaseIsNew() {
        assertEquals(CustomerSegment.NEW, segment(1, 5L));
    }

    @Test
    @DisplayName("Varias compras recientes → RECURRENTE")
    void multipleRecentPurchasesIsRecurring() {
        assertEquals(CustomerSegment.RECURRING, segment(5, 10L));
    }

    @Test
    @DisplayName("En el límite de NEW_MAX sigue siendo NUEVO")
    void atNewMaxBoundaryIsNew() {
        assertEquals(CustomerSegment.NEW, segment(NEW_MAX, 3L));
    }

    @Test
    @DisplayName("30 días sin comprar → EN RIESGO (límite inclusivo)")
    void atRiskAtThreshold() {
        assertEquals(CustomerSegment.AT_RISK, segment(5, 30L));
    }

    @Test
    @DisplayName("29 días sin comprar aún es RECURRENTE")
    void justBelowAtRiskIsRecurring() {
        assertEquals(CustomerSegment.RECURRING, segment(5, 29L));
    }

    @Test
    @DisplayName("90 días sin comprar → INACTIVO (prima sobre EN RIESGO)")
    void inactiveAtThreshold() {
        assertEquals(CustomerSegment.INACTIVE, segment(5, 90L));
        assertEquals(CustomerSegment.INACTIVE, segment(1, 200L));
    }

    @Test
    @DisplayName("Cliente con una sola compra vieja → EN RIESGO, no NUEVO")
    void oldSinglePurchaseIsAtRiskNotNew() {
        assertEquals(CustomerSegment.AT_RISK, segment(1, 45L));
    }
}
