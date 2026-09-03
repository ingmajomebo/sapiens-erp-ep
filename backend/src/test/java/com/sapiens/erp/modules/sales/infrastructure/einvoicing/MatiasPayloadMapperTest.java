package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/**
 * El mapeo es donde se pierden las facturas: un total descuadrado o un código
 * de documento equivocado hacen que la DIAN rechace sin decir por qué.
 */
@DisplayName("MatiasPayloadMapper — cuerpo enviado a la DIAN")
class MatiasPayloadMapperTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private MatiasPayloadMapper mapper;
    private EInvoicingProperties properties;
    private IssuerData issuer;

    @BeforeEach
    void setUp() {
        properties = new EInvoicingProperties();
        properties.setDefaultCityId("05001");
        properties.setDefaultPostalCode("050001");
        mapper = new MatiasPayloadMapper(properties);
        issuer = new IssuerData("900123456", "18764074347312", "FEV", 1L, 5000L);
    }

    /* ── Utilidades ──────────────────────────────────────────────────────── */

    private SalesInvoice invoiceWith(Customer customer, SalesInvoiceLine... lines) {
        SalesOrder order = SalesOrder.create("SO-000001", customer, SalesChannel.ADMIN,
                "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
        SalesInvoice inv = SalesInvoice.draft(order, "Venta de mostrador");
        for (SalesInvoiceLine l : lines) inv.addLine(l);
        inv.recomputeTotals();
        inv.emit("FEV-000123", PaymentForm.CASH, 0, InvoicePaymentMethod.CASH);
        return inv;
    }

    private SalesInvoiceLine line(String name, double qty, double price,
                                  double discountPct, double taxRate) {
        return line(name, qty, price, discountPct, taxRate, UnitOfMeasure.KG);
    }

    private SalesInvoiceLine line(String name, double qty, double price,
                                  double discountPct, double taxRate, UnitOfMeasure unit) {
        Product product = Product.create(name, null, unit, BigDecimal.ZERO, null);
        return SalesInvoiceLine.create(product, name, BigDecimal.valueOf(qty),
                BigDecimal.valueOf(price), BigDecimal.valueOf(discountPct),
                BigDecimal.valueOf(taxRate));
    }

    private Customer identified() {
        Customer c = Customer.create("Restaurante El Puerto", "pedidos@puerto.co", "3001234567", false);
        c.setDocumentType(DocumentType.NIT);
        c.setDocumentNumber("901456789");
        c.setLegalName("RESTAURANTE EL PUERTO SAS");
        c.setAddress("Calle 10 #4-56");
        return c;
    }

    private JsonNode toJson(SalesInvoice invoice) {
        return JSON.valueToTree(mapper.toRequest(invoice, issuer));
    }

    /* ── Aritmética ──────────────────────────────────────────────────────── */

    @Nested
    @DisplayName("los totales cuadran por construcción")
    class Totals {

        @Test
        @DisplayName("factura sin impuestos: base = total = suma de líneas")
        void withoutTaxes() {
            // Pescado: 2,5 kg a 24.600 = 61.500, sin IVA (excluido)
            JsonNode body = toJson(invoiceWith(identified(), line("Atún", 2.5, 24600, 0, 0)));

            JsonNode totals = body.get("legal_monetary_totals");
            assertThat(totals.get("line_extension_amount").asText()).isEqualTo("61500.00");
            assertThat(totals.get("tax_exclusive_amount").asText()).isEqualTo("61500.00");
            assertThat(totals.get("tax_inclusive_amount").asText()).isEqualTo("61500.00");
            assertThat(totals.get("payable_amount").asText()).isEqualTo("61500.00");

            // Sin impuestos no se envía el bloque: la API solo lo exige si los hay
            assertThat(body.has("tax_totals")).isFalse();
            assertThat(body.get("lines").get(0).has("tax_totals")).isFalse();
        }

        @Test
        @DisplayName("el impuesto declarado se puede recalcular desde la base enviada")
        void taxIsReproducible() {
            JsonNode body = toJson(invoiceWith(identified(), line("Conserva", 3, 12500, 10, 19)));

            JsonNode tax = body.get("lines").get(0).get("tax_totals").get(0);
            BigDecimal base = new BigDecimal(tax.get("taxable_amount").asText());
            BigDecimal percent = new BigDecimal(tax.get("percent").asText());
            BigDecimal declared = new BigDecimal(tax.get("tax_amount").asText());

            // Ésta es exactamente la validación que hace el proveedor
            BigDecimal recomputed = base.multiply(percent)
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            assertThat(declared).isEqualByComparingTo(recomputed);
        }

        @Test
        @DisplayName("total del documento = suma de líneas + suma de impuestos, ya redondeados")
        void documentTotalsMatchRoundedLines() {
            // Cantidades con decimales: es donde aparecen los centavos huérfanos
            JsonNode body = toJson(invoiceWith(identified(),
                    line("Atún", 1.333, 24600, 0, 19),
                    line("Camarón", 0.777, 38900, 5, 19)));

            BigDecimal lineSum = BigDecimal.ZERO;
            BigDecimal taxSum = BigDecimal.ZERO;
            for (JsonNode l : body.get("lines")) {
                lineSum = lineSum.add(new BigDecimal(l.get("line_extension_amount").asText()));
                taxSum = taxSum.add(new BigDecimal(l.get("tax_totals").get(0).get("tax_amount").asText()));
            }

            JsonNode totals = body.get("legal_monetary_totals");
            assertThat(new BigDecimal(totals.get("line_extension_amount").asText()))
                    .isEqualByComparingTo(lineSum);
            assertThat(new BigDecimal(totals.get("payable_amount").asText()))
                    .isEqualByComparingTo(lineSum.add(taxSum));
        }

        @Test
        @DisplayName("dos tarifas distintas se agrupan en un renglón por tarifa")
        void groupsTaxesByRate() {
            JsonNode body = toJson(invoiceWith(identified(),
                    line("Atún", 1, 20000, 0, 19),
                    line("Conserva", 1, 10000, 0, 19),
                    line("Sal", 1, 5000, 0, 5)));

            JsonNode taxes = body.get("tax_totals");
            assertThat(taxes).hasSize(2);

            // El renglón del 19% acumula las dos líneas gravadas a esa tarifa
            JsonNode iva19 = taxes.get(0);
            assertThat(iva19.get("percent").asDouble()).isEqualTo(19.0);
            assertThat(new BigDecimal(iva19.get("taxable_amount").asText()))
                    .isEqualByComparingTo("30000.00");
            assertThat(new BigDecimal(iva19.get("tax_amount").asText()))
                    .isEqualByComparingTo("5700.00");
        }
    }

    @Nested
    @DisplayName("unidad de medida")
    class Units {

        @Test
        @DisplayName("el kilo viaja como kilogramo, no como 'mutuamente definido'")
        void kilogramIsDeclared() {
            JsonNode body = toJson(invoiceWith(identified(),
                    line("Atún", 2.5, 24600, 0, 0, UnitOfMeasure.KG),
                    line("Hamburguesa", 12, 12000, 0, 0, UnitOfMeasure.UNIT)));

            // 767 = KGM en la tabla del proveedor; 1093 es "mutuamente definido"
            assertThat(body.get("lines").get(0).get("quantity_units_id").asText()).isEqualTo("767");
            assertThat(body.get("lines").get(1).get("quantity_units_id").asText()).isEqualTo("70");
        }

        @Test
        @DisplayName("se puede sobrescribir sin tocar el código")
        void overridable() {
            properties.getUnitIds().put("KG", "999");
            JsonNode body = toJson(invoiceWith(identified(),
                    line("Atún", 1, 10000, 0, 0, UnitOfMeasure.KG)));
            assertThat(body.get("lines").get(0).get("quantity_units_id").asText()).isEqualTo("999");
        }
    }

    /* ── Numeración ──────────────────────────────────────────────────────── */

    @Nested
    @DisplayName("numeración fiscal")
    class Numbering {

        @Test
        @DisplayName("el consecutivo va sin prefijo ni ceros: el proveedor compone el número")
        void stripsPrefixAndPadding() {
            JsonNode body = toJson(invoiceWith(identified(), line("Atún", 1, 10000, 0, 0)));

            assertThat(body.get("prefix").asText()).isEqualTo("FEV");
            // "FEV-000123" no puede viajar entero: daría "FEVFEV-000123"
            assertThat(body.get("document_number").asText()).isEqualTo("123");
            assertThat(body.get("resolution_number").asText()).isEqualTo("18764074347312");
        }
    }

    /* ── Cliente ─────────────────────────────────────────────────────────── */

    @Nested
    @DisplayName("adquiriente")
    class CustomerMapping {

        @Test
        @DisplayName("cliente anónimo va como consumidor final, no falla")
        void anonymousBecomesFinalConsumer() {
            Customer anon = Customer.create("Mostrador", null, null, true);
            JsonNode customer = toJson(invoiceWith(anon, line("Atún", 1, 10000, 0, 0)))
                    .get("customer");

            assertThat(customer.get("dni").asText()).isEqualTo("222222222222");
            assertThat(customer.get("company_name").asText()).isEqualTo("Consumidor final");
            // Sin correo no se puede enviar el documento por correo
            assertThat(customer.has("email")).isFalse();
        }

        @Test
        @DisplayName("un NIT se declara como persona jurídica")
        void nitIsLegalEntity() {
            JsonNode customer = toJson(invoiceWith(identified(), line("Atún", 1, 10000, 0, 0)))
                    .get("customer");

            assertThat(customer.get("identity_document_id").asText()).isEqualTo("3");
            assertThat(customer.get("type_organization_id").asInt()).isEqualTo(1);
            assertThat(customer.get("company_name").asText()).isEqualTo("RESTAURANTE EL PUERTO SAS");
            assertThat(customer.get("city_id").asText()).isEqualTo("05001");
        }

        @Test
        @DisplayName("una cédula se declara como persona natural")
        void ccIsNaturalPerson() {
            Customer c = Customer.create("Juan Pérez", "juan@correo.co", null, false);
            c.setDocumentType(DocumentType.CC);
            c.setDocumentNumber("1063279307");

            JsonNode customer = toJson(invoiceWith(c, line("Atún", 1, 10000, 0, 0)))
                    .get("customer");

            assertThat(customer.get("identity_document_id").asText()).isEqualTo("1");
            assertThat(customer.get("type_organization_id").asInt()).isEqualTo(2);
        }

        @Test
        @DisplayName("un cliente identificado sin correo se rechaza con un mensaje útil")
        void identifiedCustomerNeedsEmail() {
            Customer c = Customer.create("Sin Correo SAS", null, null, false);
            c.setDocumentType(DocumentType.NIT);
            c.setDocumentNumber("900999888");

            assertThatThrownBy(() -> toJson(invoiceWith(c, line("Atún", 1, 10000, 0, 0))))
                    .isInstanceOf(MatiasPayloadMapper.MappingException.class)
                    .hasMessageContaining("correo");
        }

        @Test
        @DisplayName("un tipo de documento sin código conocido no se adivina")
        void unknownDocumentTypeIsRefused() {
            Customer c = Customer.create("Extranjero", "ext@correo.co", null, false);
            c.setDocumentType(DocumentType.PASSPORT);
            c.setDocumentNumber("X1234567");

            assertThatThrownBy(() -> toJson(invoiceWith(c, line("Atún", 1, 10000, 0, 0))))
                    .isInstanceOf(MatiasPayloadMapper.MappingException.class)
                    .hasMessageContaining("EINVOICING_DOCUMENTTYPEIDS_PASSPORT");
        }

        @Test
        @DisplayName("y sí se envía cuando ese código está configurado")
        void configuredDocumentTypeIsUsed() {
            properties.getDocumentTypeIds().put("PASSPORT", 7);
            Customer c = Customer.create("Extranjero", "ext@correo.co", null, false);
            c.setDocumentType(DocumentType.PASSPORT);
            c.setDocumentNumber("X1234567");

            JsonNode customer = toJson(invoiceWith(c, line("Atún", 1, 10000, 0, 0)))
                    .get("customer");
            assertThat(customer.get("identity_document_id").asText()).isEqualTo("7");
        }
    }

    /* ── Pago ────────────────────────────────────────────────────────────── */

    @Nested
    @DisplayName("forma de pago")
    class Payments {

        @Test
        @DisplayName("contado: sin fecha de vencimiento")
        void cashHasNoDueDate() {
            JsonNode payment = toJson(invoiceWith(identified(), line("Atún", 1, 10000, 0, 0)))
                    .get("payments").get(0);

            assertThat(payment.get("payment_method_id").asInt()).isEqualTo(1);
            assertThat(payment.get("means_payment_id").asInt()).isEqualTo(10);
            assertThat(payment.has("payment_due_date")).isFalse();
        }

        @Test
        @DisplayName("crédito: viaja la fecha de vencimiento")
        void creditCarriesDueDate() {
            SalesOrder order = SalesOrder.create("SO-000002", identified(), SalesChannel.ADMIN,
                    "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
            SalesInvoice inv = SalesInvoice.draft(order, null);
            inv.addLine(line("Atún", 1, 10000, 0, 0));
            inv.recomputeTotals();
            inv.emit("FEV-000124", PaymentForm.CREDIT, 30, InvoicePaymentMethod.TRANSFER);

            JsonNode payment = toJson(inv).get("payments").get(0);
            assertThat(payment.get("payment_method_id").asInt()).isEqualTo(2);
            assertThat(payment.get("means_payment_id").asInt()).isEqualTo(42);
            assertThat(payment.get("payment_due_date").asText())
                    .isEqualTo(inv.getDueDate().toString());
        }
    }
}
