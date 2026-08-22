package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.sales.domain.StorefrontSetting;
import com.sapiens.erp.modules.sales.domain.StorefrontSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Textos de la página pública de pedidos. Se exponen como mapa clave→texto
 * para que añadir un texto nuevo no obligue a migrar el esquema.
 */
@Service
@RequiredArgsConstructor
public class StorefrontSettingsService {

    /**
     * Claves admitidas. Actúa como lista blanca: un PUT con una clave
     * desconocida se rechaza en vez de ensuciar la tabla con basura.
     */
    public static final Set<String> ALLOWED_KEYS = Set.of(
            "brand_emoji", "brand_name",
            "hero_title_1", "hero_title_2", "hero_subtitle", "hero_cta",
            "prop1_icon", "prop1_title", "prop1_text",
            "prop2_icon", "prop2_title", "prop2_text",
            "prop3_icon", "prop3_title", "prop3_text",
            "catalog_eyebrow", "catalog_title", "catalog_empty",
            "order_eyebrow", "order_title", "order_empty", "order_total_label",
            "delivery_question", "pickup_label", "delivery_label",
            "address_placeholder", "notes_placeholder",
            "submit_button", "submit_error",
            "cart_button",
            "confirm_eyebrow", "confirm_title", "confirm_message", "confirm_note",
            "footer_tagline", "footer_address", "footer_hours", "footer_phone"
    );

    private static final int MAX_LENGTH = 500;

    private final StorefrontSettingRepository repository;

    @Transactional(readOnly = true)
    public Map<String, String> getAll() {
        Map<String, String> out = new LinkedHashMap<>();
        repository.findAllByDeletedAtIsNull()
                .forEach(s -> out.put(s.getSettingKey(), s.getContent()));
        return out;
    }

    /**
     * Actualiza solo las claves recibidas; las ausentes conservan su valor.
     * Así el formulario puede enviar un subconjunto sin borrar el resto.
     */
    @Transactional
    public Map<String, String> update(Map<String, String> changes) {
        if (changes == null || changes.isEmpty()) {
            throw new IllegalArgumentException("No se recibió ningún texto para actualizar");
        }
        changes.forEach((key, value) -> {
            if (!ALLOWED_KEYS.contains(key)) {
                throw new IllegalArgumentException("Texto desconocido: " + key);
            }
            String text = value != null ? value.trim() : "";
            if (text.isEmpty()) {
                throw new IllegalArgumentException("El texto '" + key + "' no puede quedar vacío");
            }
            if (text.length() > MAX_LENGTH) {
                throw new IllegalArgumentException(
                        "El texto '" + key + "' supera los " + MAX_LENGTH + " caracteres");
            }
            StorefrontSetting setting = repository.findBySettingKeyAndDeletedAtIsNull(key)
                    .orElseGet(() -> StorefrontSetting.create(key, text));
            setting.setContent(text);
            repository.save(setting);
        });
        return getAll();
    }
}
