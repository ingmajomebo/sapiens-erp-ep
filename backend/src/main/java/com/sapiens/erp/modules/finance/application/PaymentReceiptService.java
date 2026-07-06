package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ApplicationRequest;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.PaymentReceiptRequest;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.PaymentReceiptResponse;
import com.sapiens.erp.modules.finance.api.dto.ReceivableDtos.ReceiptApplicationResponse;
import com.sapiens.erp.modules.finance.domain.AccountsReceivable;
import com.sapiens.erp.modules.finance.domain.AccountsReceivableRepository;
import com.sapiens.erp.modules.finance.domain.PaymentReceipt;
import com.sapiens.erp.modules.finance.domain.PaymentReceiptRepository;
import com.sapiens.erp.modules.finance.domain.ReceiptPaymentMethod;
import com.sapiens.erp.modules.finance.domain.exception.PaymentExceedsBalanceException;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.sales.application.CustomerService;
import com.sapiens.erp.modules.sales.application.SalesInvoiceService;
import com.sapiens.erp.modules.sales.domain.InvoicePaymentMethod;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Recibos de Caja (RC-NNNNNN). Principio rector: un pago parcial nunca modifica
 * la factura — se registra un recibo con consecutivo propio que se aplica contra
 * el saldo de una o varias CxC. Todo (recibo + aplicaciones + CxC + estado de
 * factura + movimiento financiero INCOME) ocurre en una sola transacción.
 */
@Service
@RequiredArgsConstructor
public class PaymentReceiptService {

    private static final Logger log = LoggerFactory.getLogger(PaymentReceiptService.class);

    private final PaymentReceiptRepository receiptRepository;
    private final AccountsReceivableRepository receivableRepository;
    private final FinancialAccountService financialAccountService;
    private final SalesInvoiceService salesInvoiceService;
    private final CustomerService customerService;
    private final UserRepository userRepository;

    @Transactional
    public PaymentReceiptResponse create(PaymentReceiptRequest req) {
        // 1. Validar aplicaciones contra las CxC (todo antes de persistir nada)
        BigDecimal applied = BigDecimal.ZERO;
        List<AccountsReceivable> receivables = new java.util.ArrayList<>();
        for (ApplicationRequest app : req.applications()) {
            AccountsReceivable ar = receivableRepository.findById(app.accountsReceivableId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Cuenta por cobrar no encontrada: " + app.accountsReceivableId()));
            if (!ar.getCustomerId().equals(req.customerId())) {
                throw new IllegalArgumentException(
                        "La CxC de la factura " + ar.getInvoiceNumber() + " no pertenece al cliente del recibo");
            }
            if (!ar.isOpen()) {
                throw new IllegalArgumentException(
                        "La CxC de la factura " + ar.getInvoiceNumber() + " no admite abonos (estado " + ar.getStatus() + ")");
            }
            if (app.amount().compareTo(ar.getPending()) > 0) {
                throw new PaymentExceedsBalanceException(
                        "El abono de " + app.amount().stripTrailingZeros().toPlainString()
                                + " supera el saldo pendiente de la factura " + ar.getInvoiceNumber()
                                + " (" + ar.getPending().stripTrailingZeros().toPlainString() + ")");
            }
            applied = applied.add(app.amount());
            receivables.add(ar);
        }
        if (applied.compareTo(req.amount()) != 0) {
            throw new IllegalArgumentException(
                    "La suma de las aplicaciones (" + applied.stripTrailingZeros().toPlainString()
                            + ") debe ser igual al monto del recibo ("
                            + req.amount().stripTrailingZeros().toPlainString() + ")");
        }

        // 2. Crear el recibo con sus aplicaciones
        PaymentReceipt receipt = PaymentReceipt.create(nextReceiptNumber(), req.customerId(),
                req.amount(), req.paymentMethod(), req.financialAccountId(),
                req.reference(), currentUserId());
        for (int i = 0; i < req.applications().size(); i++) {
            receipt.addApplication(receivables.get(i), req.applications().get(i).amount());
        }
        receiptRepository.save(receipt);

        // 3. Aplicar contra las CxC y espejar en las facturas (una sola fuente de estados)
        for (int i = 0; i < receivables.size(); i++) {
            AccountsReceivable ar = receivables.get(i);
            BigDecimal amount = req.applications().get(i).amount();
            ar.applyPayment(amount);
            receivableRepository.save(ar);
            salesInvoiceService.registerExternalPayment(ar.getInvoiceId(), amount,
                    toInvoiceMethod(req.paymentMethod()), receipt.getNumber());
        }

        // 4. Ingreso en la cuenta de caja/banco seleccionada
        String customerName = customerName(req.customerId());
        financialAccountService.registerIncome(req.financialAccountId(), req.amount(),
                "Recibo de caja " + receipt.getNumber() + " · " + customerName,
                receipt.getNumber(), receipt.getId());

        log.info("Recibo {} creado por {} aplicado a {} factura(s)",
                receipt.getNumber(), req.amount(), receivables.size());
        return toResponse(receipt);
    }

    /**
     * Compatibilidad con el flujo simple de Facturación: paga sobre una factura puntual.
     * Si la factura tiene CxC crea un recibo (sin cuenta financiera si no se indica);
     * si no la tiene (cliente no identificado), registra el pago directo en la factura.
     */
    @Transactional
    public void payInvoice(UUID invoiceId, BigDecimal amount, InvoicePaymentMethod method,
                           UUID financialAccountId, String reference) {
        var arOpt = receivableRepository.findByInvoiceId(invoiceId);
        if (arOpt.isEmpty()) {
            salesInvoiceService.registerExternalPayment(invoiceId, amount, method, reference);
            return;
        }
        AccountsReceivable ar = arOpt.get();
        if (amount == null) amount = ar.getPending();
        if (amount.compareTo(ar.getPending()) > 0) {
            throw new PaymentExceedsBalanceException(
                    "El abono de " + amount.stripTrailingZeros().toPlainString()
                            + " supera el saldo pendiente de la factura " + ar.getInvoiceNumber()
                            + " (" + ar.getPending().stripTrailingZeros().toPlainString() + ")");
        }
        if (!ar.isOpen()) {
            throw new IllegalArgumentException("La factura " + ar.getInvoiceNumber() + " no admite abonos");
        }

        PaymentReceipt receipt = PaymentReceipt.create(nextReceiptNumber(), ar.getCustomerId(),
                amount, toReceiptMethod(method), financialAccountId, reference, currentUserId());
        receipt.addApplication(ar, amount);
        receiptRepository.save(receipt);

        ar.applyPayment(amount);
        receivableRepository.save(ar);
        salesInvoiceService.registerExternalPayment(invoiceId, amount, method, receipt.getNumber());

        if (financialAccountId != null) {
            financialAccountService.registerIncome(financialAccountId, amount,
                    "Recibo de caja " + receipt.getNumber() + " · " + customerName(ar.getCustomerId()),
                    receipt.getNumber(), receipt.getId());
        }
    }

    @Transactional(readOnly = true)
    public PaymentReceiptResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    /**
     * Anulación auditable: motivo obligatorio + usuario + fecha. Revierte CxC y
     * facturas afectadas y crea el movimiento financiero inverso (nunca borra el original).
     */
    @Transactional
    public PaymentReceiptResponse voidReceipt(UUID id, String reason) {
        PaymentReceipt receipt = findById(id);
        receipt.voidReceipt(reason.trim(), currentUserId());

        for (var app : receipt.getApplications()) {
            AccountsReceivable ar = app.getReceivable();
            ar.revertPayment(app.getAmount());
            receivableRepository.save(ar);
            salesInvoiceService.revertExternalPayments(ar.getInvoiceId(), receipt.getNumber(), reason.trim());
        }

        if (receipt.getFinancialAccountId() != null) {
            financialAccountService.registerExpense(receipt.getFinancialAccountId(), receipt.getAmount(),
                    "Anulación recibo de caja " + receipt.getNumber() + ": " + reason.trim(),
                    receipt.getNumber(), receipt.getId());
        }

        receiptRepository.save(receipt);
        log.info("Recibo {} anulado: {}", receipt.getNumber(), reason);
        return toResponse(receipt);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PaymentReceipt findById(UUID id) {
        return receiptRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recibo de caja no encontrado: " + id));
    }

    private String nextReceiptNumber() {
        return String.format("RC-%06d", receiptRepository.nextReceiptNumberValue());
    }

    private InvoicePaymentMethod toInvoiceMethod(ReceiptPaymentMethod m) {
        return InvoicePaymentMethod.valueOf(m.name());
    }

    private ReceiptPaymentMethod toReceiptMethod(InvoicePaymentMethod m) {
        return ReceiptPaymentMethod.valueOf(m.name());
    }

    private String customerName(UUID customerId) {
        Map<UUID, String> names = customerService.namesByIds(List.of(customerId));
        return names.getOrDefault(customerId, "Cliente");
    }

    private PaymentReceiptResponse toResponse(PaymentReceipt r) {
        List<ReceiptApplicationResponse> apps = r.getApplications().stream()
                .map(a -> new ReceiptApplicationResponse(a.getReceivable().getId(),
                        a.getReceivable().getInvoiceNumber(), a.getAmount()))
                .toList();
        String voidedByEmail = r.getVoidedBy() != null
                ? userRepository.findById(r.getVoidedBy()).map(u -> u.getEmail()).orElse(null)
                : null;
        return PaymentReceiptResponse.from(r, customerName(r.getCustomerId()), voidedByEmail, apps);
    }

    /** UUID del usuario autenticado (el JWT usa el id como subject). */
    private UUID currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) return null;
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException notAUuid) {
            return null;
        }
    }
}
