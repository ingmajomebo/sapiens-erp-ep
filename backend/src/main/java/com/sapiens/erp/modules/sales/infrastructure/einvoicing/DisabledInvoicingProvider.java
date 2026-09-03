package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.SalesInvoice;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoicingProvider;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import com.sapiens.erp.modules.sales.domain.einvoicing.SubmissionResult;

/**
 * Proveedor de reemplazo cuando no hay ninguno configurado.
 *
 * <p>Existe para que el resto del sistema nunca tenga que preguntar si hay
 * proveedor: siempre hay uno inyectado. Sin esto, cada punto de uso llevaría
 * un {@code if (provider != null)} y tarde o temprano alguien olvidaría uno.
 *
 * <p>No lanza excepción al enviar porque nadie debería llamarlo: quien envía
 * consulta antes {@link #isEnabled()}. Si aun así llega una llamada, es un
 * error de programación y por eso sí falla ruidosamente.
 */
public class DisabledInvoicingProvider implements ElectronicInvoicingProvider {

    @Override
    public String name() {
        return "none";
    }

    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public SubmissionResult submit(SalesInvoice invoice, IssuerData issuer) {
        throw new IllegalStateException(
                "No hay proveedor de facturación electrónica configurado. "
                        + "Define EINVOICING_PROVIDER antes de enviar documentos.");
    }

    @Override
    public SubmissionResult queryStatus(String cufe, String prefix, String documentNumber) {
        throw new IllegalStateException(
                "No hay proveedor de facturación electrónica configurado.");
    }
}
