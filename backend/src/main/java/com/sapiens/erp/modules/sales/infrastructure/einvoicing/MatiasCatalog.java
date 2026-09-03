package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.DocumentType;
import com.sapiens.erp.modules.sales.domain.InvoicePaymentMethod;
import com.sapiens.erp.modules.sales.domain.PaymentForm;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;

/**
 * Códigos de las tablas internas de MATIAS.
 *
 * <p>Están reunidos aquí a propósito. Son números sin significado propio que la
 * documentación llama "IDs de la base de datos de la API, nunca códigos DIAN":
 * repartidos por el mapeo serían imposibles de auditar, y agrupados se corrigen
 * en un solo sitio si el proveedor cambia una tabla.
 *
 * <p>Los valores que llevan comentario de evidencia salen del ejemplo oficial
 * de la documentación. Los que NO se pudieron confirmar no se adivinan: el
 * mapeo falla con un mensaje claro en vez de enviar un código inventado, porque
 * un tipo de documento equivocado hace que la DIAN rechace la factura con un
 * error que no señala la causa.
 */
final class MatiasCatalog {

    private MatiasCatalog() {}

    /** Factura de venta nacional. */
    static final int TYPE_DOCUMENT_INVOICE = 7;

    /** Operación estándar, la del ejemplo oficial. */
    static final int OPERATION_TYPE_STANDARD = 1;

    /** Peso colombiano. */
    static final int CURRENCY_COP = 272;

    /** Colombia. */
    static final String COUNTRY_COLOMBIA = "45";

    /** IVA. */
    static final String TAX_IVA = "1";

    /**
     * Unidades de medida, tomadas de {@code GET /quantity-units} del propio
     * proveedor (1093 registros) y no de la documentación, que no las lista.
     *
     * <p>El valor por defecto del proveedor es el 1093, "mutuamente definido",
     * y así salía impreso en la representación gráfica: una pescadería que
     * vende por kilo entregaba facturas cuya unidad no decía nada.
     */
    static final String UNIT_MUTUALLY_DEFINED = "1093";

    private static final java.util.Map<UnitOfMeasure, String> UNITS = java.util.Map.of(
            UnitOfMeasure.KG, "767",       // KGM · kilogramo
            UnitOfMeasure.LB, "802",       // LBR · libra
            UnitOfMeasure.UNIT, "70",      // 94  · unidad
            UnitOfMeasure.PACKAGE, "923",  // PA  · paquete
            UnitOfMeasure.LITER, "821");   // LTR · litro

    /** @return el id del proveedor, o "mutuamente definido" si no hay mapeo. */
    static String unitId(UnitOfMeasure unit) {
        return unit == null ? UNIT_MUTUALLY_DEFINED : UNITS.getOrDefault(unit, UNIT_MUTUALLY_DEFINED);
    }

    /** Estándar de identificación del artículo (código interno del vendedor). */
    static final String ITEM_IDENTIFICATION_INTERNAL = "4";

    /** El precio enviado es el de venta real. */
    static final String REFERENCE_PRICE_REAL = "1";

    /** Persona jurídica / persona natural. */
    static final int ORGANIZATION_LEGAL = 1;
    static final int ORGANIZATION_NATURAL = 2;

    /** No responsable de IVA: el caso normal de un cliente de mostrador. */
    static final int TAX_REGIME_NOT_RESPONSIBLE = 2;

    /** Responsabilidad tributaria "no aplica". */
    static final int TAX_LEVEL_NA = 5;

    /** Contado / crédito. */
    static final int PAYMENT_METHOD_CASH = 1;
    static final int PAYMENT_METHOD_CREDIT = 2;

    /** Medios de pago. 10 = efectivo, 42 = consignación, 48 = tarjeta. */
    static final int MEANS_CASH = 10;
    static final int MEANS_TRANSFER = 42;
    static final int MEANS_CARD = 48;
    /** "Instrumento no definido": lo que la DIAN acepta cuando no se sabe. */
    static final int MEANS_UNDEFINED = 1;

    /**
     * Cliente sin identificar. La DIAN reserva este NIT para el consumidor
     * final, y sin él una venta de mostrador no se podría facturar.
     */
    static final String FINAL_CONSUMER_DNI = "222222222222";
    static final String FINAL_CONSUMER_NAME = "Consumidor final";

    /** Cédula de ciudadanía. Evidencia: ejemplo oficial, persona natural con cédula. */
    static final int DOC_CC = 1;
    /** NIT. Evidencia: la referencia de campos lo declara como valor por defecto. */
    static final int DOC_NIT = 3;

    /**
     * @return el id de MATIAS para el tipo de documento, o -1 si no se conoce.
     *         Quien llama debe tratar el -1 como error de configuración.
     */
    static int documentTypeId(DocumentType type) {
        if (type == null) return DOC_NIT;
        return switch (type) {
            case CC -> DOC_CC;
            case NIT -> DOC_NIT;
            // Cédula de extranjería y pasaporte tienen su propio id en la tabla
            // del proveedor, y no aparece en la documentación consultada.
            case CE, PASSPORT -> -1;
        };
    }

    static int organizationTypeId(DocumentType type) {
        return type == DocumentType.NIT ? ORGANIZATION_LEGAL : ORGANIZATION_NATURAL;
    }

    static int paymentMethodId(PaymentForm form) {
        return form == PaymentForm.CREDIT ? PAYMENT_METHOD_CREDIT : PAYMENT_METHOD_CASH;
    }

    static int meansPaymentId(InvoicePaymentMethod method) {
        if (method == null) return MEANS_UNDEFINED;
        return switch (method) {
            case CASH -> MEANS_CASH;
            case TRANSFER -> MEANS_TRANSFER;
            case CARD -> MEANS_CARD;
            case OTHER -> MEANS_UNDEFINED;
        };
    }
}
