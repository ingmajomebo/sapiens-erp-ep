package com.sapiens.erp.modules.sales.domain.exception;

import jakarta.persistence.EntityNotFoundException;

import java.util.UUID;

public class SalesOrderNotFoundException extends EntityNotFoundException {

    public SalesOrderNotFoundException(UUID id) {
        super("Sales order not found: " + id);
    }
}
