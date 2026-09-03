package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cuerpo de las peticiones y respuestas de MATIAS.
 *
 * <p>Vive en `infrastructure` y no sale de ahí: el dominio conoce
 * {@code SubmissionResult}, nunca estos registros. Si el proveedor cambia el
 * nombre de un campo, se toca este archivo y nada más.
 *
 * <p>Los campos nulos no se serializan. La API distingue "no envío el dato" de
 * "lo envío vacío", y mandar nulos hace que rechace el documento.
 */
final class MatiasDtos {

    private MatiasDtos() {}

    /* ── Petición ────────────────────────────────────────────────────────── */

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record InvoiceRequest(
            @JsonProperty("resolution_number") String resolutionNumber,
            String prefix,
            @JsonProperty("document_number") String documentNumber,
            @JsonProperty("type_document_id") int typeDocumentId,
            @JsonProperty("operation_type_id") int operationTypeId,
            @JsonProperty("currency_id") Integer currencyId,
            String date,
            String time,
            @JsonProperty("graphic_representation") int graphicRepresentation,
            @JsonProperty("send_email") int sendEmail,
            String notes,
            Customer customer,
            List<Line> lines,
            @JsonProperty("legal_monetary_totals") MonetaryTotals legalMonetaryTotals,
            @JsonProperty("tax_totals") List<Tax> taxTotals,
            List<Payment> payments
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Customer(
            @JsonProperty("company_name") String companyName,
            String dni,
            String email,
            @JsonProperty("identity_document_id") String identityDocumentId,
            @JsonProperty("type_organization_id") Integer typeOrganizationId,
            @JsonProperty("tax_regime_id") Integer taxRegimeId,
            @JsonProperty("tax_level_id") Integer taxLevelId,
            @JsonProperty("country_id") String countryId,
            @JsonProperty("city_id") String cityId,
            @JsonProperty("postal_code") String postalCode,
            String address,
            String mobile
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Line(
            @JsonProperty("invoiced_quantity") String invoicedQuantity,
            @JsonProperty("quantity_units_id") String quantityUnitsId,
            @JsonProperty("line_extension_amount") String lineExtensionAmount,
            @JsonProperty("free_of_charge_indicator") boolean freeOfChargeIndicator,
            String description,
            String code,
            @JsonProperty("type_item_identifications_id") String typeItemIdentificationsId,
            @JsonProperty("reference_price_id") String referencePriceId,
            @JsonProperty("price_amount") String priceAmount,
            @JsonProperty("base_quantity") String baseQuantity,
            @JsonProperty("tax_totals") List<Tax> taxTotals
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Tax(
            @JsonProperty("tax_id") String taxId,
            @JsonProperty("tax_amount") BigDecimal taxAmount,
            @JsonProperty("taxable_amount") BigDecimal taxableAmount,
            BigDecimal percent
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MonetaryTotals(
            @JsonProperty("line_extension_amount") String lineExtensionAmount,
            @JsonProperty("tax_exclusive_amount") String taxExclusiveAmount,
            @JsonProperty("tax_inclusive_amount") String taxInclusiveAmount,
            @JsonProperty("payable_amount") String payableAmount
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Payment(
            @JsonProperty("payment_method_id") int paymentMethodId,
            @JsonProperty("means_payment_id") int meansPaymentId,
            @JsonProperty("value_paid") String valuePaid,
            @JsonProperty("payment_due_date") String paymentDueDate
    ) {}

    /* ── Respuesta ───────────────────────────────────────────────────────── */

    /**
     * Se ignoran los campos desconocidos a propósito: el proveedor agrega
     * campos con el tiempo, y fallar por uno nuevo dejaría de radicar facturas
     * que la DIAN ya aceptó.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record InvoiceResponse(
            Boolean success,
            String message,
            /**
             * Errores de validación del PROVEEDOR, antes de llegar a la DIAN.
             * Vienen como {campo: [motivos]}. Sin ellos, un rechazo por datos
             * solo dice "Error de validación", que no le sirve a nadie para
             * saber qué corregir.
             */
            java.util.Map<String, java.util.List<String>> errors,
            /** El CUFE del documento. */
            @JsonProperty("XmlDocumentKey") String xmlDocumentKey,
            DianResponse response,
            Link pdf,
            Link qr,
            @JsonProperty("AttachedDocument") Link attachedDocument
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DianResponse(
            @JsonProperty("StatusCode") String statusCode,
            @JsonProperty("IsValid") String isValid,
            @JsonProperty("StatusDescription") String statusDescription,
            @JsonProperty("StatusMessage") String statusMessage,
            @JsonProperty("ErrorMessage") ErrorMessage errorMessage
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ErrorMessage(List<String> string) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Link(String url) {}
}
