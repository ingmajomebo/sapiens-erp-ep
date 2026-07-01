package com.sapiens.erp.modules.procurement.domain.exception;

import jakarta.persistence.EntityNotFoundException;

import java.util.UUID;

public class PurchaseOrderNotFoundException extends EntityNotFoundException {
    public PurchaseOrderNotFoundException(UUID id) {
        super("Purchase order not found: " + id);
    }
}
