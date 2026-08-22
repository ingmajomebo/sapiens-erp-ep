package com.sapiens.erp.shared.infrastructure;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Comprueba al arrancar que la clave de firma sirve.
 * <p>
 * El repositorio es público: el valor por defecto de {@code JWT_SECRET} lo
 * puede leer cualquiera. Con esa clave se falsifican tokens de administrador,
 * así que en producción el arranque debe fallar en vez de continuar en
 * silencio con una firma que no protege nada.
 * <p>
 * Fuera de producción solo se avisa: en una base local el coste de
 * equivocarse es nulo y el de no poder arrancar, alto.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtSecretValidator {

    /** El valor por defecto de application.yml. Conocido y público. */
    private static final String KNOWN_DEFAULT = "sapiens-erp-secret-key-change-in-production-min32";

    /**
     * HS512 necesita 64 bytes. Con menos, jjwt degrada el algoritmo o
     * directamente falla al firmar.
     */
    private static final int MIN_BYTES = 64;

    private final Environment environment;

    @Value("${app.jwt.secret:}")
    private String secret;

    @PostConstruct
    void validate() {
        boolean isProduction = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        String problem = problemWith(secret);

        if (problem == null) return;

        if (isProduction) {
            throw new IllegalStateException(
                    "JWT_SECRET no es válida: " + problem
                    + ". Genera una con:  openssl rand -base64 48"
                    + "  y defínela en el entorno antes de arrancar.");
        }
        log.warn("JWT_SECRET no es válida ({}). Aceptable en local; en producción "
                + "el arranque fallaría.", problem);
    }

    private String problemWith(String value) {
        if (value == null || value.isBlank()) {
            return "está vacía";
        }
        if (KNOWN_DEFAULT.equals(value)) {
            return "es el valor por defecto del repositorio, que es público";
        }
        int bytes = value.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < MIN_BYTES) {
            return "tiene " + bytes + " bytes y hacen falta al menos " + MIN_BYTES;
        }
        return null;
    }
}
