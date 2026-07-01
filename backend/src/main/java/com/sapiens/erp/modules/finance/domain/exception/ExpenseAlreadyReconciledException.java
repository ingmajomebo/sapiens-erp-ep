package com.sapiens.erp.modules.finance.domain.exception;

public class ExpenseAlreadyReconciledException extends RuntimeException {
    public ExpenseAlreadyReconciledException() {
        super("El gasto ya está conciliado y no puede modificarse");
    }
}
