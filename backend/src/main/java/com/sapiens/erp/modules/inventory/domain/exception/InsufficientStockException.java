package com.sapiens.erp.modules.inventory.domain.exception;

import java.math.BigDecimal;
import java.util.UUID;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(UUID productId, BigDecimal available, BigDecimal requested) {
        super(String.format(
                "Insufficient stock for product %s. Available: %s, requested: %s",
                productId, available, requested
        ));
    }
}
