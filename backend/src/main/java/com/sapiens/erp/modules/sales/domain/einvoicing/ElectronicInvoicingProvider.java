package com.sapiens.erp.modules.sales.domain.einvoicing;

import com.sapiens.erp.modules.sales.domain.SalesInvoice;

/**
 * Lo que el sistema necesita de un proveedor de facturación electrónica.
 *
 * <p>El dominio habla con esta interfaz y nunca con MATIAS. Cambiar de
 * proveedor es escribir otra implementación y mover una variable de entorno;
 * ni la factura ni el servicio de ventas se enteran.
 *
 * <p>Las implementaciones NO lanzan excepciones por un rechazo de la DIAN: un
 * documento rechazado es una respuesta legítima que hay que guardar y mostrar,
 * no un fallo del programa. Solo se propaga excepción cuando la conversación
 * con el proveedor no llegó a ocurrir, y para eso está {@link ProviderException}.
 */
public interface ElectronicInvoicingProvider {

    /** Nombre estable que se guarda en cada documento emitido. */
    String name();

    /**
     * ¿Está listo para operar? Falso cuando falta configuración obligatoria.
     * Se consulta antes de intentar un envío para poder explicar QUÉ falta en
     * vez de devolver un error de red confuso.
     */
    boolean isEnabled();

    /**
     * Envía la factura y devuelve el veredicto de la DIAN.
     *
     * @throws ProviderException si no se pudo hablar con el proveedor. El
     *         documento queda reintentable; no es un rechazo.
     */
    SubmissionResult submit(SalesInvoice invoice, IssuerData issuer);

    /**
     * Vuelve a preguntar por un documento ya enviado.
     *
     * <p>Existe porque la DIAN puede tardar: un envío puede responder
     * "en proceso" y resolverse minutos después. Sin esta consulta, esa factura
     * se quedaría para siempre en un estado intermedio.
     */
    SubmissionResult queryStatus(String cufe, String prefix, String documentNumber);

    /** Error de comunicación con el proveedor. Reintentable por definición. */
    class ProviderException extends RuntimeException {
        public ProviderException(String message, Throwable cause) {
            super(message, cause);
        }

        public ProviderException(String message) {
            super(message);
        }
    }
}
