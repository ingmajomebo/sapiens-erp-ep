package com.sapiens.erp.modules.finance.domain.exception;

public class InsufficientCashException extends RuntimeException {
    public InsufficientCashException(String message) {
        super(message);
    }
}
