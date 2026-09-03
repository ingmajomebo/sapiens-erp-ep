package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.einvoicing.ElectronicInvoicingProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Elige el proveedor de facturación electrónica al arrancar.
 *
 * <p>Este es el único punto del sistema que conoce la lista de proveedores.
 * Agregar uno nuevo es escribir su clase y añadir un {@code case} aquí; nada
 * más cambia, y por eso el proveedor no queda amarrado.
 */
@Configuration
@Slf4j
public class EInvoicingConfig {

    @Bean
    public ElectronicInvoicingProvider electronicInvoicingProvider(
            RestClient.Builder builder,
            MatiasPayloadMapper mapper,
            EInvoicingProperties properties) {

        if (!properties.hasProvider()) {
            log.info("Facturación electrónica desactivada (EINVOICING_PROVIDER sin definir).");
            return new DisabledInvoicingProvider();
        }

        return switch (properties.getProvider().trim().toLowerCase()) {
            case "matias" -> {
                MatiasInvoicingProvider p = new MatiasInvoicingProvider(builder, mapper, properties);
                if (p.isEnabled()) {
                    log.info("Facturación electrónica: MATIAS en {} ({})",
                            properties.getEnvironment(),
                            MatiasInvoicingProvider.resolveBaseUrl(properties));
                } else {
                    // Arrancar igual y avisar es mejor que no arrancar: el
                    // resto del ERP funciona sin facturar electrónicamente, y
                    // caerse al inicio dejaría el negocio entero parado por una
                    // variable mal escrita.
                    log.warn("MATIAS está elegido pero incompleto: falta {}. "
                                    + "Las facturas quedarán pendientes de envío.",
                            faltante(properties));
                }
                yield p;
            }
            default -> {
                log.error("EINVOICING_PROVIDER='{}' no corresponde a ningún proveedor conocido. "
                        + "Proveedores válidos: none, matias.", properties.getProvider());
                yield new DisabledInvoicingProvider();
            }
        };
    }

    private static String faltante(EInvoicingProperties p) {
        StringBuilder sb = new StringBuilder();
        if (p.getToken() == null || p.getToken().isBlank()) sb.append("EINVOICING_TOKEN, ");
        String issuerMissing = p.issuerData().missingFields();
        if (!issuerMissing.isEmpty()) sb.append(issuerMissing);
        String s = sb.toString();
        return s.endsWith(", ") ? s.substring(0, s.length() - 2) : s;
    }
}
