package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Traduce una factura del ERP al cuerpo que espera MATIAS.
 *
 * <p><b>Por qué los totales se recalculan aquí.</b> El proveedor valida la
 * aritmética del documento y rechaza el que no cuadre. El ERP guarda importes
 * con cuatro decimales y la DIAN admite dos, así que redondear cada línea y
 * copiar el total ya guardado produciría diferencias de centavos y un rechazo
 * con un mensaje que no señala la causa. Los totales que se envían se suman a
 * partir de las líneas YA redondeadas, de modo que las cuentas cuadran por
 * construcción.
 *
 * <p>Es una clase aparte del proveedor porque esto es lo que de verdad hay que
 * poder probar: el envío HTTP es trivial, el mapeo es donde están los errores.
 */
@Component
@RequiredArgsConstructor
public class MatiasPayloadMapper {

    /** La DIAN trabaja con dos decimales. */
    private static final int MONEY_SCALE = 2;
    /** Las cantidades sí admiten más precisión: se vende 1,250 kg de pescado. */
    private static final int QTY_SCALE = 3;
    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    private final EInvoicingProperties properties;

    /** Datos que faltan y sin los cuales la DIAN rechazaría el documento. */
    public static class MappingException extends RuntimeException {
        public MappingException(String message) {
            super(message);
        }
    }

    public MatiasDtos.InvoiceRequest toRequest(SalesInvoice invoice, IssuerData issuer) {
        List<SalesInvoiceLine> lines = activeLines(invoice);
        if (lines.isEmpty()) {
            throw new MappingException("La factura no tiene líneas: no hay nada que facturar.");
        }

        List<MatiasDtos.Line> mappedLines = new ArrayList<>();
        BigDecimal baseTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        // Los impuestos del documento van agrupados por tarifa, no línea a
        // línea: la DIAN quiere un renglón por cada porcentaje aplicado.
        Map<BigDecimal, BigDecimal[]> taxesByRate = new LinkedHashMap<>();

        for (SalesInvoiceLine line : lines) {
            BigDecimal base = money(line.taxableBase());
            BigDecimal rate = line.getTaxRate() == null ? BigDecimal.ZERO : line.getTaxRate();
            // Se recalcula desde la base redondeada para que el proveedor
            // pueda rehacer la multiplicación y obtener el mismo número.
            BigDecimal tax = money(base.multiply(rate).divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP));

            baseTotal = baseTotal.add(base);
            taxTotal = taxTotal.add(tax);

            List<MatiasDtos.Tax> lineTaxes = null;
            if (rate.compareTo(BigDecimal.ZERO) > 0) {
                lineTaxes = List.of(new MatiasDtos.Tax(MatiasCatalog.TAX_IVA, tax, base, rate));
                BigDecimal[] acc = taxesByRate.computeIfAbsent(rate,
                        r -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                acc[0] = acc[0].add(base);
                acc[1] = acc[1].add(tax);
            }

            mappedLines.add(new MatiasDtos.Line(
                    quantity(line.getQuantity()),
                    unitId(line),
                    plain(base),
                    false,
                    describe(line),
                    itemCode(line),
                    MatiasCatalog.ITEM_IDENTIFICATION_INTERNAL,
                    MatiasCatalog.REFERENCE_PRICE_REAL,
                    plain(money(line.getUnitPrice())),
                    quantity(line.getQuantity()),
                    lineTaxes));
        }

        BigDecimal payable = baseTotal.add(taxTotal);

        List<MatiasDtos.Tax> documentTaxes = taxesByRate.isEmpty() ? null
                : taxesByRate.entrySet().stream()
                        .map(e -> new MatiasDtos.Tax(MatiasCatalog.TAX_IVA,
                                e.getValue()[1], e.getValue()[0], e.getKey()))
                        .toList();

        LocalDate issuedDate = invoice.getIssuedAt() != null
                ? invoice.getIssuedAt().atZone(BOGOTA).toLocalDate()
                : LocalDate.now(BOGOTA);
        LocalTime issuedTime = invoice.getIssuedAt() != null
                ? invoice.getIssuedAt().atZone(BOGOTA).toLocalTime().withNano(0)
                : LocalTime.now(BOGOTA).withNano(0);

        return new MatiasDtos.InvoiceRequest(
                issuer.resolutionNumber(),
                issuer.prefix(),
                documentNumber(invoice, issuer),
                MatiasCatalog.TYPE_DOCUMENT_INVOICE,
                MatiasCatalog.OPERATION_TYPE_STANDARD,
                MatiasCatalog.CURRENCY_COP,
                issuedDate.toString(),
                issuedTime.toString(),
                // Se pide la representación gráfica: el PDF del proveedor lleva
                // el CUFE y el QR válidos, cosa que el PDF propio del ERP no
                // puede generar.
                1,
                sendEmail(invoice),
                invoice.getNotes(),
                mapCustomer(invoice.getCustomer()),
                mappedLines,
                new MatiasDtos.MonetaryTotals(
                        plain(baseTotal), plain(baseTotal), plain(payable), plain(payable)),
                documentTaxes,
                mapPayments(invoice, payable));
    }

    /* ── Cliente ─────────────────────────────────────────────────────────── */

    private MatiasDtos.Customer mapCustomer(Customer customer) {
        if (customer == null || customer.isAnonymous()) {
            return finalConsumer();
        }

        String dni = trimToNull(customer.getDocumentNumber());
        if (dni == null) {
            // Sin identificación no se puede nombrar al adquiriente, pero la
            // venta sí existe: se factura a consumidor final, que es
            // exactamente para lo que la DIAN reservó ese NIT.
            return finalConsumer();
        }

        int docTypeId = resolveDocumentType(customer.getDocumentType());

        String name = firstNonBlank(customer.getLegalName(), customer.getName());
        if (name == null) {
            throw new MappingException("El cliente no tiene nombre ni razón social.");
        }

        String email = trimToNull(customer.getEmail());
        if (email == null) {
            throw new MappingException(
                    "El cliente '" + name + "' no tiene correo, y la DIAN exige uno "
                            + "para entregarle el documento. Complétalo en su ficha.");
        }

        return new MatiasDtos.Customer(
                name,
                dni,
                email,
                String.valueOf(docTypeId),
                MatiasCatalog.organizationTypeId(customer.getDocumentType()),
                MatiasCatalog.TAX_REGIME_NOT_RESPONSIBLE,
                MatiasCatalog.TAX_LEVEL_NA,
                MatiasCatalog.COUNTRY_COLOMBIA,
                trimToNull(properties.getDefaultCityId()),
                trimToNull(properties.getDefaultPostalCode()),
                trimToNull(customer.getAddress()),
                trimToNull(customer.getPhone()));
    }

    private MatiasDtos.Customer finalConsumer() {
        return new MatiasDtos.Customer(
                MatiasCatalog.FINAL_CONSUMER_NAME,
                MatiasCatalog.FINAL_CONSUMER_DNI,
                null,
                String.valueOf(MatiasCatalog.DOC_NIT),
                MatiasCatalog.ORGANIZATION_NATURAL,
                MatiasCatalog.TAX_REGIME_NOT_RESPONSIBLE,
                MatiasCatalog.TAX_LEVEL_NA,
                MatiasCatalog.COUNTRY_COLOMBIA,
                trimToNull(properties.getDefaultCityId()),
                trimToNull(properties.getDefaultPostalCode()),
                null,
                null);
    }

    /**
     * Un tipo de documento equivocado hace que la DIAN rechace la factura con
     * un error genérico. Antes que adivinar, se exige configurarlo.
     */
    private int resolveDocumentType(DocumentType type) {
        Integer override = type == null ? null : properties.getDocumentTypeIds().get(type.name());
        if (override != null) return override;

        int known = MatiasCatalog.documentTypeId(type);
        if (known < 0) {
            throw new MappingException(
                    "No está configurado el código de MATIAS para el tipo de documento "
                            + type + ". Defínelo con EINVOICING_DOCUMENTTYPEIDS_" + type + ".");
        }
        return known;
    }

    /* ── Pagos ───────────────────────────────────────────────────────────── */

    private List<MatiasDtos.Payment> mapPayments(SalesInvoice invoice, BigDecimal payable) {
        boolean credit = invoice.getPaymentForm() == PaymentForm.CREDIT;
        String dueDate = credit && invoice.getDueDate() != null
                ? invoice.getDueDate().toString()
                : null;

        return List.of(new MatiasDtos.Payment(
                MatiasCatalog.paymentMethodId(invoice.getPaymentForm()),
                MatiasCatalog.meansPaymentId(invoice.getPaymentMethod()),
                plain(payable),
                dueDate));
    }

    /* ── Detalles ────────────────────────────────────────────────────────── */

    private String documentNumber(SalesInvoice invoice, IssuerData issuer) {
        String number = trimToNull(invoice.getInvoiceNumber());
        if (number == null) {
            throw new MappingException("La factura no tiene número: no se ha emitido.");
        }
        // El consecutivo va SIN prefijo: el proveedor lo compone. Enviar
        // "FEV-000123" cuando el prefijo ya es "FEV" produce "FEVFEV-000123".
        String prefix = issuer.prefix();
        if (prefix != null && !prefix.isBlank() && number.startsWith(prefix)) {
            number = number.substring(prefix.length());
        }
        String digits = number.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            throw new MappingException(
                    "El número de factura '" + invoice.getInvoiceNumber()
                            + "' no contiene un consecutivo numérico.");
        }
        // Sin ceros a la izquierda: el consecutivo es un número, y "000123"
        // y "123" son el mismo documento para la DIAN.
        return String.valueOf(Long.parseLong(digits));
    }

    private int sendEmail(SalesInvoice invoice) {
        Customer c = invoice.getCustomer();
        boolean hasEmail = c != null && !c.isAnonymous() && trimToNull(c.getEmail()) != null;
        return hasEmail ? 1 : 0;
    }

    private String describe(SalesInvoiceLine line) {
        String d = trimToNull(line.getDescription());
        return d != null ? d : "Producto";
    }

    /**
     * La unidad sale del producto. Sin producto —una línea suelta— no hay
     * unidad que declarar y se envía "mutuamente definido", que es justamente
     * lo que significa.
     */
    private String unitId(SalesInvoiceLine line) {
        var product = line.getProduct();
        String override = product == null || product.getUnitOfMeasure() == null ? null
                : properties.getUnitIds().get(product.getUnitOfMeasure().name());
        if (override != null) return override;
        return product == null ? MatiasCatalog.UNIT_MUTUALLY_DEFINED
                : MatiasCatalog.unitId(product.getUnitOfMeasure());
    }

    private String itemCode(SalesInvoiceLine line) {
        if (line.getProduct() != null && trimToNull(line.getProduct().getSku()) != null) {
            return line.getProduct().getSku();
        }
        // El código es obligatorio. Cuando el producto no tiene SKU se usa su
        // identificador, que siempre existe y es único.
        return line.getProduct() != null
                ? line.getProduct().getId().toString().substring(0, 8)
                : "SIN-CODIGO";
    }

    private List<SalesInvoiceLine> activeLines(SalesInvoice invoice) {
        return invoice.getLines().stream().filter(l -> l.getDeletedAt() == null).toList();
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private static String plain(BigDecimal value) {
        return value.toPlainString();
    }

    private static String quantity(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value)
                .setScale(QTY_SCALE, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String firstNonBlank(String a, String b) {
        String x = trimToNull(a);
        return x != null ? x : trimToNull(b);
    }
}
