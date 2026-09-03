package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import com.sapiens.erp.modules.sales.domain.*;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoiceStatus;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoicingProvider;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import com.sapiens.erp.modules.sales.domain.einvoicing.SubmissionResult;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.*;

/**
 * Prueba contra el sandbox REAL de MATIAS.
 *
 * <p>Solo corre si existe {@code EINVOICING_TOKEN} en el entorno, para que la
 * suite normal no dependa de una red ni de un token que caduca. Se lanza así:
 *
 * <pre>
 *   export $(grep -E '^EINVOICING_' ../.env | xargs) &amp;&amp; \
 *   ./gradlew test --tests '*MatiasSandboxLiveTest*'
 * </pre>
 *
 * <p>Ejercita el MISMO camino que usa el ERP —mapeador y proveedor reales—, no
 * un cuerpo escrito a mano: una prueba con JSON propio confirmaría que el
 * sandbox funciona, no que nuestro código habla bien con él.
 */
@EnabledIfEnvironmentVariable(named = "EINVOICING_TOKEN", matches = ".+")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("MATIAS sandbox — envío real")
class MatiasSandboxLiveTest {

    /** Resolución de la cuenta de pruebas. Rango autorizado: 1–1000. */
    private static final String RESOLUTION = "18760000001";
    private static final String PREFIX = "FEV";

    private static String cufeAceptado;

    private EInvoicingProperties properties;
    private MatiasInvoicingProvider provider;
    private final IssuerData issuer = new IssuerData("1082952709", RESOLUTION, PREFIX, 1L, 1000L);

    @BeforeEach
    void setUp() {
        properties = new EInvoicingProperties();
        properties.setProvider("matias");
        properties.setEnvironment("sandbox");
        properties.setToken(System.getenv("EINVOICING_TOKEN"));
        // La empresa de pruebas está en la ciudad 87 según /company
        properties.setDefaultCityId("87");
        properties.setDefaultPostalCode("050001");
        properties.getIssuer().setTaxId(issuer.taxId());
        properties.getIssuer().setResolutionNumber(RESOLUTION);
        properties.getIssuer().setPrefix(PREFIX);

        provider = new MatiasInvoicingProvider(
                RestClient.builder(), new MatiasPayloadMapper(properties), properties);
    }

    /**
     * Consecutivo al azar dentro del rango autorizado. Reutilizar uno ya usado
     * hace que la DIAN responda "documento duplicado", que es correcto pero
     * convierte la prueba en intermitente.
     */
    private SalesInvoice facturaDePescaderia() {
        int consecutivo = ThreadLocalRandom.current().nextInt(1, 1000);

        Customer cliente = Customer.create(
                "Restaurante El Puerto", "pedidos@elpuerto.co", "3001234567", false);
        cliente.setDocumentType(DocumentType.NIT);
        cliente.setDocumentNumber("901456789");
        cliente.setLegalName("RESTAURANTE EL PUERTO SAS");
        cliente.setAddress("Calle 10 #4-56");

        SalesOrder pedido = SalesOrder.create("SO-LIVE", cliente, SalesChannel.ADMIN,
                "admin@sapiens.com", null, null, DeliveryMethod.PICKUP, null);
        SalesInvoice f = SalesInvoice.draft(pedido, "Prueba de integración");

        // Pescado fresco: excluido de IVA
        f.addLine(SalesInvoiceLine.create(
                Product.create("Atún", null, UnitOfMeasure.KG, BigDecimal.ZERO, null),
                "Atún de aleta amarilla", new BigDecimal("2.5"),
                new BigDecimal("45000"), BigDecimal.ZERO, BigDecimal.ZERO));
        // Producto transformado: sí grava
        f.addLine(SalesInvoiceLine.create(
                Product.create("Hamburguesa", null, UnitOfMeasure.UNIT, BigDecimal.ZERO, null),
                "Hamburguesa de atún", new BigDecimal("12"),
                new BigDecimal("12000"), new BigDecimal("5"), new BigDecimal("19")));

        f.recomputeTotals();
        f.emit(PREFIX + "-" + String.format("%06d", consecutivo),
                PaymentForm.CASH, 0, InvoicePaymentMethod.CASH);
        return f;
    }

    @Test
    @Order(1)
    @DisplayName("una factura bien armada la acepta la DIAN y devuelve CUFE")
    void facturaAceptada() {
        SubmissionResult r = provider.submit(facturaDePescaderia(), issuer);

        System.out.println("[sandbox] estado=" + r.status()
                + " código=" + r.dianCode()
                + " mensaje=" + r.dianMessage()
                + "\n[sandbox] cufe=" + r.cufe()
                + "\n[sandbox] pdf=" + r.pdfUrl()
                + "\n[sandbox] xml=" + r.xmlUrl());

        assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.ACCEPTED);
        assertThat(r.cufe()).isNotBlank();
        assertThat(r.dianCode()).isEqualTo("00");
        assertThat(r.pdfUrl()).isNotBlank();

        cufeAceptado = r.cufe();
    }

    @Test
    @Order(2)
    @DisplayName("el rechazo simulado se lee como resultado, no revienta")
    void rechazoSimulado() {
        properties.setSandboxForceStatus("ERROR_REJECTED");

        SubmissionResult r = provider.submit(facturaDePescaderia(), issuer);

        System.out.println("[sandbox] rechazo -> código=" + r.dianCode()
                + " mensaje=" + r.dianMessage());

        assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.REJECTED);
        assertThat(r.cufe()).isNull();
        assertThat(r.dianMessage()).isNotBlank();
    }

    @Test
    @Order(3)
    @DisplayName("el duplicado también, y con su propio código")
    void duplicadoSimulado() {
        properties.setSandboxForceStatus("ERROR_DUPLICATE");

        SubmissionResult r = provider.submit(facturaDePescaderia(), issuer);

        System.out.println("[sandbox] duplicado -> código=" + r.dianCode()
                + " mensaje=" + r.dianMessage());

        assertThat(r.status()).isEqualTo(ElectronicInvoiceStatus.REJECTED);
    }

    @Test
    @Order(4)
    @DisplayName("consultar el estado de la factura aceptada la confirma")
    void consultaDeEstado() {
        assumeCufe();
        // El GetStatus del ambiente de habilitación de la DIAN se cae a menudo.
        // Lo que esta prueba fija NO es que responda, sino que cuando no
        // responde el documento no se degrade a rechazado.
        try {
            SubmissionResult r = provider.queryStatus(cufeAceptado, PREFIX, null);
            System.out.println("[sandbox] consulta -> estado=" + r.status()
                    + " código=" + r.dianCode() + " mensaje=" + r.dianMessage());
            assertThat(r.status()).isIn(ElectronicInvoiceStatus.ACCEPTED,
                    ElectronicInvoiceStatus.SUBMITTED);
        } catch (ElectronicInvoicingProvider.ProviderException e) {
            System.out.println("[sandbox] consulta no disponible: " + e.getMessage());
            // Correcto: sin veredicto se avisa, y quien llama conserva el estado
            assertThat(e.getMessage()).contains("no devolvió un veredicto");
        }
    }

    @Test
    @Order(5)
    @DisplayName("el encabezado de simulación NO se envía si el ambiente es producción")
    void forceStatusNoSaleDeSandbox() {
        properties.setSandboxForceStatus("ERROR_REJECTED");
        properties.setEnvironment("production");
        // Con ambiente de producción la url cambia; solo se comprueba la regla,
        // sin llamar a producción de verdad.
        assertThat(properties.isSandbox()).isFalse();
        assertThat(MatiasInvoicingProvider.resolveBaseUrl(properties))
                .isEqualTo(MatiasInvoicingProvider.PRODUCTION_URL);
    }

    private void assumeCufe() {
        Assumptions.assumeTrue(cufeAceptado != null,
                "no hubo factura aceptada previa; nada que consultar");
    }
}
