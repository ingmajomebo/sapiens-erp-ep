package com.sapiens.erp.modules.sales.domain.einvoicing;

/**
 * Los datos de la empresa que factura y de su autorización ante la DIAN.
 *
 * <p>El sistema no los tenía en ninguna parte: hasta ahora el PDF de factura
 * llevaba un NIT de relleno escrito en el código. La DIAN no acepta un
 * documento sin resolución y rango vigentes, así que esto es requisito de la
 * integración, no un adorno.
 *
 * @param taxId            NIT del emisor, sin dígito de verificación
 * @param resolutionNumber número de resolución de facturación
 * @param prefix           prefijo autorizado (p. ej. "FEV")
 * @param rangeFrom        primer consecutivo autorizado
 * @param rangeTo          último consecutivo autorizado
 */
public record IssuerData(
        String taxId,
        String resolutionNumber,
        String prefix,
        Long rangeFrom,
        Long rangeTo
) {

    /**
     * ¿Están todos los datos obligatorios?
     *
     * <p>El rango es opcional a propósito: la DIAN lo exige en la resolución,
     * pero quien vigila que no se agote es el proveedor, y bloquear la emisión
     * por no tenerlo configurado sería peor que emitir.
     */
    public boolean isComplete() {
        return notBlank(taxId) && notBlank(resolutionNumber) && notBlank(prefix);
    }

    /** Qué falta, en palabras, para poder decirlo en pantalla. */
    public String missingFields() {
        StringBuilder sb = new StringBuilder();
        if (!notBlank(taxId)) sb.append("NIT del emisor, ");
        if (!notBlank(resolutionNumber)) sb.append("número de resolución DIAN, ");
        if (!notBlank(prefix)) sb.append("prefijo, ");
        return sb.isEmpty() ? "" : sb.substring(0, sb.length() - 2);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
