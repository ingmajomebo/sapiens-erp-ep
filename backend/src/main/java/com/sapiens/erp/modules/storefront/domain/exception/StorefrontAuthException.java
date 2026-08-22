package com.sapiens.erp.modules.storefront.domain.exception;

/** Credenciales inválidas o cuenta inexistente. Mensaje deliberadamente vago. */
public class StorefrontAuthException extends RuntimeException {
    public StorefrontAuthException() {
        super("Correo o contraseña incorrectos");
    }
}
