package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.AccountsPayableResponse;
import com.sapiens.erp.modules.finance.api.dto.PaymentRequest;
import com.sapiens.erp.modules.finance.api.dto.SupplierPaymentResponse;
import com.sapiens.erp.modules.finance.domain.*;
import com.sapiens.erp.modules.procurement.domain.PurchaseReceipt;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountsPayableService {

    private final AccountsPayableRepository repository;
    private final SupplierPaymentRepository paymentRepository;
    private final FinancialAccountService financialAccountService;

    @Transactional(readOnly = true)
    public List<AccountsPayableResponse> listAll() {
        return repository.findAllActive().stream()
                .map(AccountsPayableResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AccountsPayableResponse> listPending() {
        return repository.findAllPending().stream()
                .map(AccountsPayableResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountsPayableResponse getByPurchaseOrderId(UUID poId) {
        return repository.findByPurchaseOrderId(poId)
                .map(AccountsPayableResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("No existe factura para la orden: " + poId));
    }

    @Transactional(readOnly = true)
    public List<SupplierPaymentResponse> getPaymentHistory(UUID apId) {
        return paymentRepository.findByAccountsPayableId(apId).stream()
                .map(SupplierPaymentResponse::from)
                .toList();
    }

    @Transactional
    public AccountsPayableResponse createFromReceipt(PurchaseReceipt receipt) {
        return repository.findByPurchaseOrderId(receipt.getPurchaseOrder().getId())
                .map(AccountsPayableResponse::from)
                .orElseGet(() -> {
                    long seq = repository.nextInvoiceNumber();
                    String invoiceNumber = String.format("FAC-%06d", seq);
                    LocalDate dueDate = receipt.getPurchaseOrder().getExpectedDelivery() != null
                            ? receipt.getPurchaseOrder().getExpectedDelivery().plusDays(30)
                            : LocalDate.now().plusDays(30);
                    AccountsPayable ap = AccountsPayable.createFromReceipt(receipt, invoiceNumber, dueDate);
                    return AccountsPayableResponse.from(repository.save(ap));
                });
    }

    @Transactional
    public AccountsPayableResponse registerPayment(UUID id, PaymentRequest req) {
        AccountsPayable ap = repository.findById(id)
                .filter(AccountsPayable::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta por pagar no encontrada: " + id));

        if (ap.getStatus() == AccountsPayableStatus.PAID) {
            throw new IllegalStateException("Esta factura ya está pagada completamente");
        }
        if (ap.getStatus() == AccountsPayableStatus.CANCELLED) {
            throw new IllegalStateException("No se puede registrar un pago en una factura anulada");
        }
        if (req.amount().signum() <= 0) {
            throw new IllegalArgumentException("El monto del pago debe ser mayor a 0");
        }
        if (req.amount().compareTo(ap.pendingAmount()) > 0) {
            throw new IllegalArgumentException(
                    "El pago de " + req.amount() + " supera el saldo pendiente de " + ap.pendingAmount());
        }

        SupplierPayment payment = SupplierPayment.create(ap, req);
        paymentRepository.save(payment);

        if (req.financialAccountId() != null) {
            String concept = "Pago factura proveedor " + ap.getSupplier().getName()
                    + " · " + ap.getInvoiceNumber();
            financialAccountService.registerExpense(
                    req.financialAccountId(), req.amount(), concept,
                    ap.getInvoiceNumber(), payment.getId());
        }

        ap.registerPayment(req.amount());
        return AccountsPayableResponse.from(repository.save(ap));
    }
}
