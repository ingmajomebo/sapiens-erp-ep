package com.sapiens.erp.modules.inventory.domain.exception;

import java.util.UUID;

public class LocationNotFoundException extends RuntimeException {

    public LocationNotFoundException(UUID id) {
        super("Storage location not found: " + id);
    }
}
