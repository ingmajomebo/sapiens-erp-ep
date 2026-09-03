package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.SalesInvoice;
import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoicingProvider;
import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import com.sapiens.erp.modules.sales.domain.einvoicing.SubmissionResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Proveedor MATIAS (Colombia, UBL 2.1).
 *
 * <p>Traduce en las dos direcciones: del dominio al cuerpo de la API con
 * {@link MatiasPayloadMapper}, y de la respuesta al veredicto del dominio.
 *
 * <p><b>Un rechazo NO es una excepción.</b> Cuando la DIAN contesta que el
 * documento tiene errores, eso es información que hay que guardar y mostrarle
 * al usuario, no un fallo del programa. Solo se lanza excepción cuando la
 * conversación no llegó a ocurrir, y por eso los 4xx de validación se leen y
 * se convierten en un resultado, en vez de dejar que el cliente HTTP los
 * convierta en error.
 */
@Slf4j
public class MatiasInvoicingProvider implements ElectronicInvoicingProvider {

    static final String SANDBOX_URL = "https://sandbox-api.matias-api.com/api/ubl2.1";
    static final String PRODUCTION_URL = "https://api.matias-api.com/api/ubl2.1";

    /** Encabezado de simulación del sandbox. */
    static final String FORCE_STATUS_HEADER = "X-Sandbox-Force-Status";

    /** La DIAN acepta con "00"; "98" significa que sigue procesando. */
    private static final String DIAN_ACCEPTED = "00";
    private static final String DIAN_IN_PROCESS = "98";

    private final RestClient client;
    private final MatiasPayloadMapper mapper;
    private final EInvoicingProperties properties;

    public MatiasInvoicingProvider(RestClient.Builder builder,
                                   MatiasPayloadMapper mapper,
                                   EInvoicingProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
        this.client = builder
                .baseUrl(resolveBaseUrl(properties))
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    static String resolveBaseUrl(EInvoicingProperties p) {
        if (p.getBaseUrl() != null && !p.getBaseUrl().isBlank()) {
            return p.getBaseUrl().trim();
        }
        return p.isSandbox() ? SANDBOX_URL : PRODUCTION_URL;
    }

    @Override
    public String name() {
        return "matias";
    }

    @Override
    public boolean isEnabled() {
        return properties.getToken() != null && !properties.getToken().isBlank()
                && properties.issuerData().isComplete();
    }

    @Override
    public SubmissionResult submit(SalesInvoice invoice, IssuerData issuer) {
        MatiasDtos.InvoiceRequest body = mapper.toRequest(invoice, issuer);

        Holder holder = new Holder();
        try {
            client.post()
                    .uri("/invoice")
                    .header("Authorization", "Bearer " + properties.getToken())
                    .headers(h -> forceStatusHeader().ifPresent(v -> h.add(FORCE_STATUS_HEADER, v)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    // Todo el rango 4xx/5xx se captura para poder leer el
                    // cuerpo: ahí viene el motivo del rechazo.
                    .exchange((request, response) -> {
                        holder.status = response.getStatusCode();
                        holder.raw = readBody(response);
                        holder.parsed = parseJson(holder.raw);
                        return null;
                    });
        } catch (RestClientException e) {
            throw new ProviderException(
                    "No se pudo contactar al proveedor de facturación electrónica: "
                            + e.getMessage(), e);
        }

        return interpret(holder, invoice.getInvoiceNumber());
    }

    @Override
    public SubmissionResult queryStatus(String cufe, String prefix, String documentNumber) {
        if (cufe == null || cufe.isBlank()) {
            throw new ProviderException(
                    "No se puede consultar el estado de un documento sin CUFE.");
        }
        // En sandbox la consulta va contra el ambiente de habilitación de la
        // DIAN, que es una ruta distinta. Usar la de producción devolvería
        // "documento no encontrado" para todo lo emitido en pruebas.
        String path = (properties.isSandbox() ? "/status/document/test/" : "/status/document/")
                + cufe;

        Holder holder = new Holder();
        try {
            client.post()
                    .uri(path)
                    .header("Authorization", "Bearer " + properties.getToken())
                    .exchange((request, response) -> {
                        holder.status = response.getStatusCode();
                        holder.raw = readBody(response);
                        holder.parsed = parseStatusJson(holder.raw);
                        return null;
                    });
        } catch (RestClientException e) {
            throw new ProviderException(
                    "No se pudo consultar el estado ante la DIAN: " + e.getMessage(), e);
        }

        // Una consulta que no devuelve veredicto NO es un rechazo. El servicio
        // de consulta de la DIAN se cae con cierta frecuencia, y tratar su
        // caída como "documento rechazado" convertiría facturas ya radicadas en
        // rechazadas: el peor error posible de este módulo.
        if (holder.parsed == null || holder.parsed.response() == null
                || holder.parsed.response().statusCode() == null) {
            throw new ProviderException(
                    "La DIAN no devolvió un veredicto para el documento "
                            + (documentNumber != null ? documentNumber : cufe)
                            + ". El estado no cambia; se puede volver a consultar.");
        }

        return interpret(holder, documentNumber);
    }

    /**
     * Solo en sandbox. Un valor olvidado en la configuración de producción no
     * debe poder alterar el resultado de una factura real.
     */
    private java.util.Optional<String> forceStatusHeader() {
        String v = properties.getSandboxForceStatus();
        return properties.isSandbox() && v != null && !v.isBlank()
                ? java.util.Optional.of(v.trim())
                : java.util.Optional.empty();
    }

    /* ── Lectura de la respuesta ─────────────────────────────────────────── */

    private SubmissionResult interpret(Holder holder, String reference) {
        MatiasDtos.InvoiceResponse r = holder.parsed;

        if (r == null) {
            // Sin cuerpo legible no se puede afirmar nada. Un 5xx es del
            // proveedor y se reintenta; un 4xx sin cuerpo es configuración.
            if (holder.status != null && holder.status.is5xxServerError()) {
                throw new ProviderException("El proveedor respondió HTTP "
                        + holder.status.value() + " sin detalle. Reintentable.");
            }
            throw new ProviderException("Respuesta ilegible del proveedor (HTTP "
                    + (holder.status != null ? holder.status.value() : "?") + "): " + holder.raw);
        }

        MatiasDtos.DianResponse dian = r.response();
        String code = dian != null ? dian.statusCode() : null;
        String message = firstMessage(r, dian);

        if (DIAN_ACCEPTED.equals(code)) {
            return SubmissionResult.accepted(
                    r.xmlDocumentKey(), code, message,
                    url(r.qr()), url(r.pdf()), url(r.attachedDocument()));
        }

        if (DIAN_IN_PROCESS.equals(code)) {
            return SubmissionResult.submitted(r.xmlDocumentKey(), code, message);
        }

        // Sin código pero con éxito declarado: el documento quedó encolado.
        if (code == null && Boolean.TRUE.equals(r.success())) {
            return SubmissionResult.submitted(r.xmlDocumentKey(), null, message);
        }

        log.warn("Documento {} rechazado por la DIAN (código {}): {}", reference, code, message);
        return SubmissionResult.rejected(code, message);
    }

    /** Los errores vienen en una lista aparte del mensaje general. */
    private String firstMessage(MatiasDtos.InvoiceResponse r, MatiasDtos.DianResponse dian) {
        if (dian != null && dian.errorMessage() != null) {
            List<String> errors = dian.errorMessage().string();
            if (errors != null) {
                // Una aceptación llega con {"string": ""}: la cadena vacía se
                // convierte en un elemento en blanco que no es ningún error.
                String joined = errors.stream()
                        .filter(x -> x != null && !x.isBlank())
                        .reduce((a, b) -> a + " · " + b)
                        .orElse("");
                if (!joined.isEmpty()) return joined;
            }
        }
        if (dian != null && dian.statusMessage() != null) return dian.statusMessage();
        if (dian != null && dian.statusDescription() != null) return dian.statusDescription();

        // Rechazo por validación del proveedor: el motivo útil está en `errors`,
        // no en `message`, que siempre dice lo mismo.
        if (r.errors() != null && !r.errors().isEmpty()) {
            StringBuilder sb = new StringBuilder(r.message() == null ? "" : r.message());
            r.errors().forEach((campo, motivos) -> {
                if (motivos == null) return;
                sb.append(sb.isEmpty() ? "" : " · ").append(campo).append(": ")
                  .append(String.join("; ", motivos));
            });
            return sb.toString();
        }
        return r.message();
    }

    private static String url(MatiasDtos.Link link) {
        return link != null ? link.url() : null;
    }

    private static String readBody(org.springframework.http.client.ClientHttpResponse response) {
        try (var in = response.getBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private MatiasDtos.InvoiceResponse parseJson(String raw) {
        try {
            return JsonSupport.MAPPER.readValue(raw, MatiasDtos.InvoiceResponse.class);
        } catch (Exception e) {
            log.debug("No se pudo interpretar la respuesta del proveedor: {}", raw, e);
            return null;
        }
    }

    /**
     * La consulta de estado envuelve el veredicto en la estructura SOAP que
     * devuelve la DIAN, así que hay que bajar por el árbol hasta encontrarlo.
     */
    private MatiasDtos.InvoiceResponse parseStatusJson(String raw) {
        try {
            var root = JsonSupport.MAPPER.readTree(raw);
            var result = root.path("ResponseDian").path("Envelope").path("Body")
                    .path("GetStatusResponse").path("GetStatusResult");
            // Sin GetStatusResult no hay veredicto. Antes se intentaba leer el
            // cuerpo como si fuera una respuesta de emisión, y un error del
            // servidor de la DIAN acababa interpretado como rechazo.
            if (result.isMissingNode()) return null;

            var dian = new MatiasDtos.DianResponse(
                    result.path("StatusCode").asText(null),
                    result.path("IsValid").asText(null),
                    result.path("StatusDescription").asText(null),
                    result.path("StatusMessage").asText(null),
                    null);
            return new MatiasDtos.InvoiceResponse(
                    root.path("success").asBoolean(false),
                    root.path("message").asText(null),
                    null, null, dian, null, null, null);
        } catch (Exception e) {
            log.debug("No se pudo interpretar el estado devuelto: {}", raw, e);
            return null;
        }
    }

    /** Estado mutable de una llamada, para poder leer cuerpo y código a la vez. */
    private static final class Holder {
        HttpStatusCode status;
        String raw;
        MatiasDtos.InvoiceResponse parsed;
    }

    private static final class JsonSupport {
        /**
         * Tolerante con la forma de las listas a propósito.
         *
         * <p>La API devuelve {@code ErrorMessage.string} como texto cuando hay
         * un solo mensaje y como lista cuando hay varios. Sin
         * ACCEPT_SINGLE_VALUE_AS_ARRAY, una factura ACEPTADA se leía como
         * "respuesta ilegible" y quedaba marcada como fallida pese a estar
         * radicada ante la DIAN, que es el peor error posible aquí.
         */
        static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
                com.fasterxml.jackson.databind.json.JsonMapper.builder()
                        .enable(com.fasterxml.jackson.databind.DeserializationFeature
                                .ACCEPT_SINGLE_VALUE_AS_ARRAY)
                        .build();
    }

}
