package com.sapiens.erp.modules.inventory.domain.exception;

import java.math.BigDecimal;
import java.util.UUID;

public class InsufficientStockAtLocationException extends RuntimeException {

    public InsufficientStockAtLocationException(UUID productId, String locationName,
                                                BigDecimal available, BigDecimal requested) {
        super(String.format(
                "Insufficient stock for product %s at location '%s'. Available: %s, requested: %s",
                productId, locationName, available, requested
        ));
    }
}
