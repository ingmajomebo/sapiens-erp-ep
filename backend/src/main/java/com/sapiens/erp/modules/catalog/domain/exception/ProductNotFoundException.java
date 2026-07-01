package com.sapiens.erp.modules.catalog.domain.exception;

import jakarta.persistence.EntityNotFoundException;

import java.util.UUID;

public class ProductNotFoundException extends EntityNotFoundException {

    public ProductNotFoundException(UUID id) {
        super("Product not found: " + id);
    }
}
