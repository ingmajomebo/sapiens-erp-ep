package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySource;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Las variables de entorno llegan vacías cuando nadie las define, y una
 * variable vacía que no sabe convertirse tumba el arranque del backend entero.
 * Esta prueba existe porque ese fallo aparecería en el despliegue, no aquí.
 */
@DisplayName("EInvoicingProperties — enlace desde variables de entorno")
class EInvoicingPropertiesBindingTest {

    private EInvoicingProperties bind(Map<String, Object> values) {
        ConfigurationPropertySource source = new MapConfigurationPropertySource(values);
        return new Binder(source)
                .bind("einvoicing", EInvoicingProperties.class)
                .orElseGet(EInvoicingProperties::new);
    }

    @Test
    @DisplayName("todo vacío: arranca apagada y no falla al convertir los rangos")
    void emptyValuesDoNotBreakStartup() {
        Map<String, Object> v = new HashMap<>();
        v.put("einvoicing.provider", "none");
        v.put("einvoicing.token", "");
        v.put("einvoicing.base-url", "");
        // Éstos son numéricos: una cadena vacía debe quedar en null, no reventar
        v.put("einvoicing.issuer.range-from", "");
        v.put("einvoicing.issuer.range-to", "");

        EInvoicingProperties p = bind(v);

        assertThat(p.hasProvider()).isFalse();
        assertThat(p.getIssuer().getRangeFrom()).isNull();
        assertThat(p.issuerData().isComplete()).isFalse();
    }

    @Test
    @DisplayName("configurada: los datos del emisor quedan completos")
    void configured() {
        Map<String, Object> v = new HashMap<>();
        v.put("einvoicing.provider", "matias");
        v.put("einvoicing.environment", "sandbox");
        v.put("einvoicing.token", "pat-123");
        v.put("einvoicing.issuer.tax-id", "900123456");
        v.put("einvoicing.issuer.resolution-number", "18764074347312");
        v.put("einvoicing.issuer.prefix", "FEV");
        v.put("einvoicing.issuer.range-from", "1");
        v.put("einvoicing.issuer.range-to", "5000");

        EInvoicingProperties p = bind(v);

        assertThat(p.hasProvider()).isTrue();
        assertThat(p.isSandbox()).isTrue();
        assertThat(p.issuerData().isComplete()).isTrue();
        assertThat(p.getIssuer().getRangeTo()).isEqualTo(5000L);
    }

    @Test
    @DisplayName("falta el prefijo: dice exactamente qué falta")
    void namesWhatIsMissing() {
        Map<String, Object> v = new HashMap<>();
        v.put("einvoicing.provider", "matias");
        v.put("einvoicing.issuer.tax-id", "900123456");
        v.put("einvoicing.issuer.resolution-number", "18764074347312");

        assertThat(bind(v).issuerData().missingFields()).isEqualTo("prefijo");
    }

    @Test
    @DisplayName("los códigos de tipo de documento se pueden sobrescribir")
    void documentTypeOverrides() {
        Map<String, Object> v = new HashMap<>();
        v.put("einvoicing.provider", "matias");
        v.put("einvoicing.document-type-ids.PASSPORT", "7");

        assertThat(bind(v).getDocumentTypeIds()).containsEntry("PASSPORT", 7);
    }
}
