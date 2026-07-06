package com.sapiens.erp.modules.sales;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.inventory.api.dto.AdjustmentRequest;
import com.sapiens.erp.modules.inventory.api.dto.ExitRequest;
import com.sapiens.erp.modules.inventory.application.InventoryService;
import com.sapiens.erp.modules.inventory.domain.MovementType;
import com.sapiens.erp.modules.sales.api.dto.SalesInvoiceDtos.EmitRequest;
import com.sapiens.erp.modules.sales.application.SalesInvoiceService;
import com.sapiens.erp.modules.sales.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalesInvoiceService — descuento de inventario en la venta")
class SalesInvoiceInventoryTest {

    @Mock SalesInvoiceRepository invoiceRepository;
    @Mock SalesOrderRepository orderRepository;
    @Mock SalesInvoicePaymentRepository paymentRepository;
    @Mock SalesInvoiceHistoryRepository historyRepository;
    @Mock CreditNoteRepository creditNoteRepository;
    @Mock UserRepository userRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock InventoryService inventoryService;

    SalesInvoiceService service;

    Product tracked;
    Product notTracked;

    @BeforeEach
    void setUp() {
        service = new SalesInvoiceService(invoiceRepository, orderRepository, paymentRepository,
                historyRepository, creditNoteRepository, userRepository, eventPublisher, inventoryService);
        tracked = Product.create("Salmón", null, null, BigDecimal.ZERO, null);
        notTracked = Product.create("Servicio de corte", null, null, BigDecimal.ZERO, null);
        notTracked.setInventoryTrackingEnabled(false);
        when(paymentRepository.sumByInvoiceId(any())).thenReturn(BigDecimal.ZERO);
    }

    private SalesInvoice draftWith(Product... products) {
        Customer customer = Customer.create("Cliente", null, null, false);
        SalesOrder order = SalesOrder.create("SO-000001", customer, SalesChannel.ADMIN,
                "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
        SalesInvoice inv = SalesInvoice.draft("FV-000001", order, null);
        for (Product p : products) {
            inv.addLine(SalesInvoiceLine.create(p, p.getName(), new BigDecimal("3"),
                    new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO));
        }
        inv.recomputeTotals();
        return inv;
    }

    @Test
    @DisplayName("Emitir descuenta stock (EXIT) solo de líneas con producto que controla inventario")
    void emitDecrementsTrackedLinesOnly() {
        UUID id = UUID.randomUUID();
        SalesInvoice inv = draftWith(tracked, notTracked);
        when(invoiceRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(inv));

        service.emit(id, new EmitRequest(PaymentForm.CASH, 0, InvoicePaymentMethod.CASH));

        ArgumentCaptor<ExitRequest> captor = ArgumentCaptor.forClass(ExitRequest.class);
        verify(inventoryService, times(1)).registerExit(captor.capture());
        ExitRequest exit = captor.getValue();
        assertThat(exit.productId()).isEqualTo(tracked.getId());
        assertThat(exit.quantity()).isEqualByComparingTo("3");
        assertThat(exit.reason()).contains("FV-000001");
        verifyNoMoreInteractions(inventoryService);
    }

    @Test
    @DisplayName("Anular una factura emitida repone stock (ajuste positivo con motivo)")
    void cancelRestoresStock() {
        UUID id = UUID.randomUUID();
        SalesInvoice inv = draftWith(tracked);
        inv.emit(PaymentForm.CASH, 0, InvoicePaymentMethod.CASH); // ya EMITIDA
        when(invoiceRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(inv));
        when(creditNoteRepository.nextNoteNumberValue()).thenReturn(1001L);

        service.cancel(id, "Devolución del cliente");

        ArgumentCaptor<AdjustmentRequest> captor = ArgumentCaptor.forClass(AdjustmentRequest.class);
        verify(inventoryService, times(1)).registerAdjustment(captor.capture());
        AdjustmentRequest adj = captor.getValue();
        assertThat(adj.productId()).isEqualTo(tracked.getId());
        assertThat(adj.type()).isEqualTo(MovementType.POSITIVE_ADJUSTMENT);
        assertThat(adj.quantity()).isEqualByComparingTo("3");
        assertThat(adj.reason()).contains("FV-000001");
    }

    @Test
    @DisplayName("Cancelar un BORRADOR no toca inventario (nunca se descontó)")
    void cancelDraftDoesNotTouchInventory() {
        UUID id = UUID.randomUUID();
        SalesInvoice inv = draftWith(tracked); // sigue en BORRADOR
        when(invoiceRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(inv));

        service.cancel(id, "Se anula el borrador");

        verifyNoInteractions(inventoryService);
    }
}
