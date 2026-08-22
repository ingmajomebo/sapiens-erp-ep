package com.sapiens.erp.modules.storefront.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Resuelve la cuenta del cliente a partir del token de la tienda.
 * <p>
 * No toca el SecurityContext: los endpoints de la tienda son públicos y la
 * cuenta es opcional (se puede comprar como invitado). Deja el id en un
 * atributo del request para que el controlador lo lea si existe.
 */
@Component
@RequiredArgsConstructor
public class StorefrontAuthenticationFilter extends OncePerRequestFilter {

    public static final String ACCOUNT_ID_ATTRIBUTE = "storefrontAccountId";

    private final StorefrontTokenService tokenService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            UUID accountId = tokenService.resolveAccountId(header.substring(7));
            if (accountId != null) {
                request.setAttribute(ACCOUNT_ID_ATTRIBUTE, accountId);
            }
        }
        chain.doFilter(request, response);
    }
}
