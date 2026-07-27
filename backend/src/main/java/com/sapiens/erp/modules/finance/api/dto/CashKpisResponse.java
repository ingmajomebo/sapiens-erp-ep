package com.sapiens.erp.modules.finance.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashKpisResponse(
        UUID sessionId,
        String sessionNumber,
        String status,
        Instant openedAt,
        String openedByName,
        BigDecimal openingAmount,
        BigDecimal expectedBalance,
        BigDecimal totalSales,
        BigDecimal totalApPayments,
        BigDecimal totalExpenses,
        BigDecimal totalManualIn,
        BigDecimal totalManualOut,
        long movementCount,
        BigDecimal pmCash,
        BigDecimal pmCard,
        BigDecimal pmTransfer
) {}
