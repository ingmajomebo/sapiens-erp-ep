package com.sapiens.erp.modules.storefront.domain.exception;

import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Falta de stock en el canal público. Lleva el detalle de la presentación
 * concreta para que la tienda pueda señalarla y ofrecer quitarla del carrito.
 */
@Getter
public class StorefrontOutOfStockException extends RuntimeException {

    private final UUID presentationId;
    private final String productName;
    private final String presentationName;
    private final BigDecimal available;
    private final BigDecimal requested;

    public StorefrontOutOfStockException(UUID presentationId, String productName,
                                         String presentationName,
                                         BigDecimal available, BigDecimal requested) {
        super("No hay stock suficiente de " + productName + " — " + presentationName);
        this.presentationId = presentationId;
        this.productName = productName;
        this.presentationName = presentationName;
        this.available = available;
        this.requested = requested;
    }
}
