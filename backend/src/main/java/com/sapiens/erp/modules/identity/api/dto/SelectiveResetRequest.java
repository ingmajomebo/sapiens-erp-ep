package com.sapiens.erp.modules.identity.api.dto;

public record SelectiveResetRequest(
        boolean salesOrders,
        boolean invoices,
        boolean accountsReceivable,
        boolean expenses
) {}
