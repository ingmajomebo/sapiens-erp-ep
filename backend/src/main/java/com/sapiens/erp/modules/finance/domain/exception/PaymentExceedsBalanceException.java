package com.sapiens.erp.modules.finance.domain.exception;

/** El abono supera el saldo pendiente de la CxC (los anticipos están fuera de alcance en V1). */
public class PaymentExceedsBalanceException extends RuntimeException {

    public PaymentExceedsBalanceException(String message) {
        super(message);
    }
}
