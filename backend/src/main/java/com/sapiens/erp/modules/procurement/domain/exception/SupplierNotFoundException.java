package com.sapiens.erp.modules.procurement.domain.exception;

import jakarta.persistence.EntityNotFoundException;

import java.util.UUID;

public class SupplierNotFoundException extends EntityNotFoundException {

    public SupplierNotFoundException(UUID id) {
        super("Supplier not found: " + id);
    }
}
