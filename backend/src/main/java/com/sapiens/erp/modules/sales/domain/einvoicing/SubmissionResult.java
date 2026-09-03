package com.sapiens.erp.modules.sales.domain.einvoicing;

/**
 * Veredicto del proveedor sobre un documento, en términos del dominio.
 *
 * <p>Deliberadamente NO expone el JSON del proveedor. Si lo hiciera, el resto
 * del sistema empezaría a leer campos de MATIAS y la interfaz dejaría de servir
 * para cambiar de proveedor, que es justo lo que se quiere evitar.
 *
 * @param status      en qué quedó el documento
 * @param cufe        identificador único ante la DIAN; null si no se aceptó
 * @param dianCode    código crudo de la DIAN ("00", "99"…), para rastrear
 * @param dianMessage descripción legible del resultado
 * @param qrUrl       imagen del QR de validación
 * @param pdfUrl      representación gráfica
 * @param xmlUrl      XML firmado, que es el documento legal
 */
public record SubmissionResult(
        ElectronicInvoiceStatus status,
        String cufe,
        String dianCode,
        String dianMessage,
        String qrUrl,
        String pdfUrl,
        String xmlUrl
) {

    public static SubmissionResult accepted(String cufe, String dianCode, String message,
                                            String qrUrl, String pdfUrl, String xmlUrl) {
        return new SubmissionResult(ElectronicInvoiceStatus.ACCEPTED, cufe, dianCode, message,
                qrUrl, pdfUrl, xmlUrl);
    }

    /**
     * La DIAN respondió que el documento tiene errores. No es reintentable tal
     * cual: hay que corregir los datos y volver a emitir.
     */
    public static SubmissionResult rejected(String dianCode, String message) {
        return new SubmissionResult(ElectronicInvoiceStatus.REJECTED, null, dianCode, message,
                null, null, null);
    }

    /**
     * Enviado pero sin veredicto todavía. La DIAN responde así cuando encola el
     * documento; hay que volver a consultarlo.
     */
    public static SubmissionResult submitted(String cufe, String dianCode, String message) {
        return new SubmissionResult(ElectronicInvoiceStatus.SUBMITTED, cufe, dianCode, message,
                null, null, null);
    }
}
