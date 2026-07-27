package com.sapiens.erp.modules.finance.api.dto;

import java.math.BigDecimal;

public record OpenRegisterRequest(
        BigDecimal openingBalance,
        String notes
) {}
