package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.application.StorefrontSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Administración de los textos de la página pública. El canal público los
 *  recibe dentro de la respuesta del catálogo, no por aquí. */
@RestController
@RequestMapping("/api/v1/storefront-settings")
@RequiredArgsConstructor
public class StorefrontSettingsController {

    private final StorefrontSettingsService storefrontSettingsService;

    @GetMapping
    public ResponseEntity<Map<String, String>> getAll() {
        return ResponseEntity.ok(storefrontSettingsService.getAll());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('SALES_STOREFRONT_MANAGE')")
    public ResponseEntity<Map<String, String>> update(@RequestBody Map<String, String> changes) {
        return ResponseEntity.ok(storefrontSettingsService.update(changes));
    }
}
