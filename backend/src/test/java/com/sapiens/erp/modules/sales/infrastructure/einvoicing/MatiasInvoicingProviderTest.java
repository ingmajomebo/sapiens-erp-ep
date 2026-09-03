package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoiceStatus;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoicingProvider;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import com.sapiens.erp.modules.sales.domain.einvoicing.SubmissionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Comprueba cómo se lee la respuesta del proveedor.
 *
 * <p>Los cuerpos de respuesta son los del ejemplo oficial de la documentación,
 * no inventados: si MATIAS cambia su formato, esta prueba deja de reflejar la
 * realidad y hay que actualizarla contra la documentación nueva.
 */
@DisplayName("MatiasInvoicingProvider — lectura del veredicto de la DIAN")
class MatiasInvoicingProviderTest {

    private static final String ACCEPTED_BODY = """
            {
              "message": "El documento ha sido procesado por la DIAN.",
              "send_to_queue": 0,
              "XmlDocumentKey": "d45f3b2ed042ce0e075891591c3b3a7ae3a9c176ca191dab1bd23e5cdd3b48b8",
              "response": {
                "ErrorMessage": { "string": [] },
                "IsValid": "true",
                "StatusCode": "00",
                "StatusDescription": "Procesado Correctamente.",
                "StatusMessage": "La Factura electrónica FEV123, ha sido autorizada.",
                "XmlFileName": "fv09010914030002500000095"
              },
              "pdf": { "url": "https://api-v2.matias-api.com/pdf/1/fv0901.pdf" },
              "AttachedDocument": { "url": "https://api-v2.matias-api.com/attachments/1/ad/ad0901.xml" },
              "success": true
            }
            """;

    private static final String REJECTED_BODY = """
            {
              "success": false,
              "message": "El documento ha sido rechazado por la DIAN.",
              "response": {
                "StatusCode": "99",
                "IsValid": "false",
                "StatusDescription": "Documento con errores en campos mandatorios.",
                "ErrorMessage": {
                  "string": [
                    "Regla: FAS01A, Rechazo: Valor Total Factura no corresponde",
                    "Regla: FAD06, Rechazo: Esquema no valido"
                  ]
                }
              }
            }
            """;

    private static final String STATUS_BODY = """
            {
              "message": "Consulta realizada",
              "ResponseDian": {
                "Envelope": { "Body": { "GetStatusResponse": { "GetStatusResult": {
                  "IsValid": "true",
                  "StatusCode": "00",
                  "StatusDescription": "Procesado Correctamente.",
                  "StatusMessage": "La Factura electrónica FEV123, ha sido autorizada."
                }}}}
              },
              "success": true
            }
            """;

    private MockRestServiceServer server;
    private MatiasInvoicingProvider provider;
    private EInvoicingProperties properties;
    private final IssuerData issuer =
            new IssuerData("900123456", "18764074347312", "FEV", 1L, 5000L);

    @BeforeEach
    void setUp() {
        properties = new EInvoicingProperties();
        properties.setProvider("matias");
        properties.setEnvironment("sandbox");
        properties.setToken("token-de-prueba");
        properties.setDefaultCityId("05001");
        properties.setDefaultPostalCode("050001");
        properties.getIssuer().setTaxId("900123456");
        properties.getIssuer().setResolutionNumber("18764074347312");
        properties.getIssuer().setPrefix("FEV");

        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new MatiasInvoicingProvider(builder, new MatiasPayloadMapper(properties), properties);
    }

    private SalesInvoice invoice() {
        Customer customer = Customer.create("Restaurante El Puerto", "pedidos@puerto.co", null, false);
        customer.setDocumentType(DocumentType.NIT);
        customer.setDocumentNumber("901456789");

        SalesOrder order = SalesOrder.create("SO-000001", customer, SalesChannel.ADMIN,
                "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
        SalesInvoice inv = SalesInvoice.draft(order, null);
        Product p = Product.create("Atún", null, null, BigDecimal.ZERO, null);
        inv.addLine(SalesInvoiceLine.create(p, "Atún de aleta amarilla", new BigDecimal("2.5"),
                new BigDecimal("24600"), BigDecimal.ZERO, BigDecimal.ZERO));
        inv.recomputeTotals();
        inv.emit("FEV-000123", PaymentForm.CASH, 0, InvoicePaymentMethod.CASH);
        return inv;
    }

    @org.junit.jupiter.api.Nested
    @DisplayName("envío")
    class Submit {

        @Test
        @DisplayName("aceptada: devuelve CUFE, PDF y XML")
        void accepted() {
            server.expect(requestTo(MatiasInvoicingProvider.SANDBOX_URL + "/invoice"))
                    .andExpect(method(org.springframework.http.HttpMethod.POST))
                    .andExpect(header("Authorization", "Bearer token-de-prueba"))
                    .andExpect(jsonPath("$.resolution_number").value("18764074347312"))
                    .andExpect(jsonPath("$.document_number").value("123"))
                    .andExpect(jsonPath("$.type_document_id").value(7))
                    .andRespond(withSuccess(ACCEPTED_BODY, MediaType.APPLICATION_JSON));

            SubmissionResult r = provider.submit(invoice(), issuer);

            assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.ACCEPTED);
            assertThat(r.cufe()).isEqualTo("d45f3b2ed042ce0e075891591c3b3a7ae3a9c176ca191dab1bd23e5cdd3b48b8");
            assertThat(r.pdfUrl()).endsWith("fv0901.pdf");
            assertThat(r.xmlUrl()).endsWith("ad0901.xml");
            assertThat(r.dianCode()).isEqualTo("00");
            server.verify();
        }

        @Test
        @DisplayName("rechazada: no lanza excepción y reúne todos los motivos")
        void rejectedIsAResultNotAnError() {
            server.expect(requestTo(MatiasInvoicingProvider.SANDBOX_URL + "/invoice"))
                    .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                            .body(REJECTED_BODY).contentType(MediaType.APPLICATION_JSON));

            SubmissionResult r = provider.submit(invoice(), issuer);

            assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.REJECTED);
            assertThat(r.cufe()).isNull();
            // Los dos motivos se conservan: quedarse con el primero esconde
            // el segundo error, que hay que corregir también
            assertThat(r.dianMessage()).contains("FAS01A").contains("FAD06");
            server.verify();
        }

        @Test
        @DisplayName("un 500 del proveedor sí es excepción: es reintentable")
        void serverErrorIsRetryable() {
            server.expect(requestTo(MatiasInvoicingProvider.SANDBOX_URL + "/invoice"))
                    .andRespond(withServerError());

            SalesInvoice inv = invoice();
            assertThatThrownBy(() -> provider.submit(inv, issuer))
                    .isInstanceOf(ElectronicInvoicingProvider.ProviderException.class)
                    .hasMessageContaining("Reintentable");
            server.verify();
        }
    }

    @org.junit.jupiter.api.Nested
    @DisplayName("consulta de estado")
    class Status {

        @Test
        @DisplayName("en sandbox pregunta por la ruta de habilitación, no la de producción")
        void usesTestRouteInSandbox() {
            server.expect(requestTo(MatiasInvoicingProvider.SANDBOX_URL
                            + "/status/document/test/CUFE123"))
                    .andRespond(withSuccess(STATUS_BODY, MediaType.APPLICATION_JSON));

            SubmissionResult r = provider.queryStatus("CUFE123", "FEV", "123");

            assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.ACCEPTED);
            assertThat(r.dianCode()).isEqualTo("00");
            server.verify();
        }

        @Test
        @DisplayName("sin CUFE no se consulta nada")
        void needsCufe() {
            assertThatThrownBy(() -> provider.queryStatus(null, "FEV", "123"))
                    .isInstanceOf(ElectronicInvoicingProvider.ProviderException.class);
        }

        @Test
        @DisplayName("si el servicio de la DIAN falla, NO se concluye rechazo")
        void dianFailureIsNotARejection() {
            // Respuesta real del sandbox: la DIAN devuelve un fallo SOAP y el
            // proveedor lo reenvía con HTTP 200 y success=false. Leerlo como
            // rechazo convertiría una factura ya radicada en rechazada.
            String fallo = """
                    {
                      "message": "Error interno del servidor. Error 500: Internal Server Error.",
                      "success": false
                    }
                    """;
            server.expect(requestTo(MatiasInvoicingProvider.SANDBOX_URL
                            + "/status/document/test/CUFE123"))
                    .andRespond(withSuccess(fallo, MediaType.APPLICATION_JSON));

            assertThatThrownBy(() -> provider.queryStatus("CUFE123", "FEV", "123"))
                    .isInstanceOf(ElectronicInvoicingProvider.ProviderException.class)
                    .hasMessageContaining("no devolvió un veredicto");
            server.verify();
        }
    }

    @Test
    @DisplayName("la url del ambiente se puede reemplazar sin tocar el código")
    void baseUrlIsOverridable() {
        properties.setBaseUrl("http://localhost:9999/api");
        assertThat(MatiasInvoicingProvider.resolveBaseUrl(properties))
                .isEqualTo("http://localhost:9999/api");

        properties.setBaseUrl("");
        properties.setEnvironment("production");
        assertThat(MatiasInvoicingProvider.resolveBaseUrl(properties))
                .isEqualTo(MatiasInvoicingProvider.PRODUCTION_URL);
    }
}
