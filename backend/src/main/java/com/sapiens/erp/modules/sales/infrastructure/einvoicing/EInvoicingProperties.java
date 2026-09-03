package com.sapiens.erp.modules.sales.infrastructure.einvoicing;

import com.sapiens.erp.modules.sales.domain.einvoicing.IssuerData;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuración de la facturación electrónica, desde variables de entorno.
 *
 * <p>Ninguna credencial vive en el código ni en la base de datos. Cambiar de
 * proveedor o de ambiente es cambiar {@code EINVOICING_PROVIDER} y reiniciar.
 *
 * <p>El valor por defecto de {@code provider} es {@code none}: un sistema
 * recién instalado NO factura electrónicamente hasta que alguien lo configure
 * a propósito. Arrancar intentando enviar a la DIAN con datos de relleno sería
 * peor que no enviar nada.
 */
@Component
@ConfigurationProperties(prefix = "einvoicing")
@Getter
@Setter
public class EInvoicingProperties {

    /** Proveedor activo: {@code none} o {@code matias}. */
    private String provider = "none";

    /** {@code sandbox} o {@code production}. */
    private String environment = "sandbox";

    /** Token de acceso del proveedor. */
    private String token = "";

    /**
     * URL base. Vacía usa la del ambiente elegido; se puede fijar para apuntar
     * a un servidor de pruebas propio sin tocar el código.
     */
    private String baseUrl = "";

    /** Segundos de espera antes de dar por perdida una llamada. */
    private int timeoutSeconds = 60;

    /**
     * Fuerza una respuesta simulada de la DIAN. SOLO tiene efecto en sandbox:
     * el proveedor ignora este encabezado en producción, y aquí además no se
     * envía si el ambiente no es sandbox, para que un valor olvidado en la
     * configuración no pueda afectar a facturas reales.
     *
     * <p>Sirve para que QA reproduzca rechazos sin fabricar facturas malas:
     * {@code ERROR_REJECTED}, {@code ERROR_DUPLICATE}, {@code ERROR_SCHEMA}…
     */
    private String sandboxForceStatus = "";

    /**
     * Ciudad y código postal que se envían cuando el cliente no los tiene.
     *
     * <p>La DIAN los exige para clientes colombianos y la ficha de cliente del
     * ERP solo guarda la ciudad como texto libre, que no sirve: hace falta el
     * código DANE. Hasta que exista ese catálogo, se usa la ciudad del emisor,
     * que es donde ocurre la venta de mostrador.
     */
    private String defaultCityId = "";
    private String defaultPostalCode = "";

    /**
     * Ids de tipo de documento del proveedor, por si su tabla no coincide con
     * los valores conocidos. Ejemplo: {@code EINVOICING_DOCUMENTTYPEIDS_CE=5}.
     */
    private final java.util.Map<String, Integer> documentTypeIds = new java.util.HashMap<>();

    /**
     * Ids de unidad de medida del proveedor, por si su tabla cambia.
     * Ejemplo: {@code EINVOICING_UNITIDS_KG=767}.
     */
    private final java.util.Map<String, String> unitIds = new java.util.HashMap<>();

    private final Issuer issuer = new Issuer();

    @Getter
    @Setter
    public static class Issuer {
        private String taxId = "";
        private String resolutionNumber = "";
        private String prefix = "";
        private Long rangeFrom;
        private Long rangeTo;
    }

    public IssuerData issuerData() {
        return new IssuerData(issuer.getTaxId(), issuer.getResolutionNumber(),
                issuer.getPrefix(), issuer.getRangeFrom(), issuer.getRangeTo());
    }

    public boolean isSandbox() {
        return !"production".equalsIgnoreCase(environment);
    }

    /** ¿Hay algún proveedor elegido? */
    public boolean hasProvider() {
        return provider != null && !provider.isBlank() && !"none".equalsIgnoreCase(provider);
    }
}
