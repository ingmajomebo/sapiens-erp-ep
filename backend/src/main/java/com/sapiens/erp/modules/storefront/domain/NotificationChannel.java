package com.sapiens.erp.modules.storefront.domain;

/**
 * Por dónde se avisará cuando el producto vuelva.
 * <p>
 * Hoy nada consume esto: la solicitud se registra y se atiende a mano. Está
 * declarado para que conectar WhatsApp más adelante no obligue a migrar datos.
 */
public enum NotificationChannel { WHATSAPP, EMAIL, IN_APP }
