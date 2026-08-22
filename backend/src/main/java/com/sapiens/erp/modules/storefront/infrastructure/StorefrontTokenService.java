package com.sapiens.erp.modules.storefront.infrastructure;

import com.sapiens.erp.modules.storefront.domain.StorefrontAccount;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Tokens de los clientes de la tienda.
 * <p>
 * Van marcados con {@code typ = customer}. El filtro del ERP rechaza ese tipo
 * y este servicio rechaza cualquier otro, así que un token de cliente no puede
 * abrir el panel administrativo ni al revés, aunque compartan clave de firma.
 */
@Service
public class StorefrontTokenService {

    /** Valor del claim que distingue a un cliente del personal del ERP. */
    public static final String TOKEN_TYPE_CLAIM = "typ";
    public static final String CUSTOMER_TYPE = "customer";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.storefront.token-expiration:604800000}")
    private long expiration;

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(StorefrontAccount account) {
        return Jwts.builder()
                .subject(account.getId().toString())
                .claim(TOKEN_TYPE_CLAIM, CUSTOMER_TYPE)
                .claim("name", account.getName())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Devuelve el id de la cuenta, o null si el token no es válido o no es
     * de un cliente. Nunca lanza: el filtro sigue como anónimo.
     */
    public UUID resolveAccountId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!CUSTOMER_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))) {
                return null;   // token de staff: aquí no vale
            }
            return UUID.fromString(claims.getSubject());
        } catch (Exception ignored) {
            return null;
        }
    }

    /** Token opaco para consultar un pedido sin cuenta. */
    public String generateTrackingToken() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
