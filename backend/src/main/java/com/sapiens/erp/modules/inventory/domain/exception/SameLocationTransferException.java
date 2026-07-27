package com.sapiens.erp.modules.inventory.domain.exception;

public class SameLocationTransferException extends RuntimeException {

    public SameLocationTransferException() {
        super("Transfer origin and destination must be different locations");
    }
}
