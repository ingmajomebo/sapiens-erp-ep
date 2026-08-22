package com.sapiens.erp.modules.storefront.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;

/**
 * Cálculo del envío. El servidor manda: lo que muestre el carrito es
 * indicativo y se recalcula aquí al crear el pedido.
 *
 * PENDIENTE DE CONFIRMAR con el negocio: las tres cifras son un supuesto.
 */
@Component
public class StorefrontShipping {

    @Value("${app.storefront.shipping.local-cost:8000}")
    private BigDecimal localCost;

    @Value("${app.storefront.shipping.national-cost:18000}")
    private BigDecimal nationalCost;

    @Value("${app.storefront.shipping.free-threshold:150000}")
    private BigDecimal freeThreshold;

    @Value("${app.storefront.shipping.local-city:medellin}")
    private String localCity;

    public BigDecimal costFor(String city, BigDecimal subtotal) {
        if (subtotal.compareTo(freeThreshold) >= 0) return BigDecimal.ZERO;
        return normalize(city).equals(normalize(localCity)) ? localCost : nationalCost;
    }

    /** Compara sin tildes ni mayúsculas: "Medellín" y "medellin" son la misma. */
    private String normalize(String value) {
        if (value == null) return "";
        String stripped = Normalizer.normalize(value.trim().toLowerCase(), Normalizer.Form.NFD);
        return stripped.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }
}
