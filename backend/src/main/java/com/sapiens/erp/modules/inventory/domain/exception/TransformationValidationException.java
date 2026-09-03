package com.sapiens.erp.modules.inventory.domain.exception;

/** Error estructural que impide confirmar o anular una transformación. */
public class TransformationValidationException extends RuntimeException {
    public TransformationValidationException(String message) {
        super(message);
    }
}
