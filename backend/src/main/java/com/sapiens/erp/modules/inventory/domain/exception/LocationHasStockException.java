package com.sapiens.erp.modules.inventory.domain.exception;

import java.math.BigDecimal;

public class LocationHasStockException extends RuntimeException {

    public LocationHasStockException(String locationName, BigDecimal stock) {
        super(String.format(
                "Cannot delete location '%s': it still holds %.3f units of stock",
                locationName, stock
        ));
    }

    public LocationHasStockException(String message) {
        super(message);
    }
}
