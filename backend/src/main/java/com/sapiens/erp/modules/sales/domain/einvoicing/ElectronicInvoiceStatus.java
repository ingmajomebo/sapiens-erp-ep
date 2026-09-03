package com.sapiens.erp.modules.sales.domain.einvoicing;

/**
 * En qué punto está una factura frente a la DIAN.
 *
 * <p>Es un estado APARTE del de la factura. Una factura puede estar PAGADA y
 * rechazada por la DIAN al mismo tiempo: el cliente pagó, pero el documento
 * legal no existe. Mezclar ambos estados escondería exactamente ese caso, que
 * es el que hay que resolver a mano.
 */
public enum ElectronicInvoiceStatus {

    /** Emitida en el sistema, aún no enviada. Estado inicial de todo documento. */
    PENDING,

    /** Enviada y aceptada por el proveedor, pero la DIAN aún no da veredicto. */
    SUBMITTED,

    /** La DIAN la validó. Aquí ya existe CUFE y el documento es legal. */
    ACCEPTED,

    /**
     * La DIAN la rechazó por errores en los datos. Reintentar sin corregir
     * dará el mismo rechazo: hay que arreglar la factura.
     */
    REJECTED,

    /**
     * No se pudo enviar: red caída, credenciales malas, proveedor fuera de
     * servicio. Los datos pueden estar perfectos, así que sí es reintentable.
     */
    FAILED;

    /** ¿Tiene sentido volver a intentarlo tal como está? */
    public boolean isRetryable() {
        return this == PENDING || this == FAILED;
    }

    /** ¿Hay que volver a preguntar por su veredicto? */
    public boolean awaitsVerdict() {
        return this == SUBMITTED;
    }

    /** ¿El documento ya es legal ante la DIAN? */
    public boolean isFinal() {
        return this == ACCEPTED;
    }
}
