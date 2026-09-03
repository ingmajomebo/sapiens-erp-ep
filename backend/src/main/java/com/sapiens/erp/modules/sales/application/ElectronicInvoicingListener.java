package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.domain.SalesInvoiceRepository;
import com.sapiens.erp.modules.sales.domain.event.InvoiceEmittedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Conecta la emisión de una factura con su envío a la DIAN.
 *
 * <p>Son dos escuchas del mismo evento, y la separación es deliberada:
 *
 * <ul>
 *   <li>El registro del documento PENDIENTE corre DENTRO de la transacción de
 *       emisión. Si la emisión se revierte, el rastro también; nunca queda un
 *       documento electrónico apuntando a una factura que no existe.</li>
 *   <li>El envío corre DESPUÉS de confirmar. Así la llamada al proveedor —que
 *       puede tardar un minuto— no mantiene abierta la transacción que descontó
 *       inventario, y una caída del proveedor no impide vender.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ElectronicInvoicingListener {

    private final ElectronicInvoicingService service;
    private final SalesInvoiceRepository invoiceRepository;

    /** Misma transacción que la emisión. */
    @EventListener
    public void onEmittedRegister(InvoiceEmittedEvent event) {
        invoiceRepository.findById(event.invoiceId())
                .ifPresent(service::registerPending);
    }

    /** Después de confirmar la emisión. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmittedSubmit(InvoiceEmittedEvent event) {
        try {
            service.submit(event.invoiceId());
        } catch (RuntimeException e) {
            // Nada de lo que pase aquí puede tumbar la venta: ya está hecha y
            // confirmada. El documento queda FALLIDO y se reintenta a mano.
            log.error("Error inesperado al enviar la factura {} a la DIAN",
                    event.invoiceNumber(), e);
        }
    }
}
