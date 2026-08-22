package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.CatalogResponse;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.ProductResponse;
import com.sapiens.erp.modules.storefront.application.StorefrontCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Catálogo de la tienda. Sin autenticación. */
@RestController
@RequestMapping("/api/v1/public/catalog")
@RequiredArgsConstructor
public class StorefrontCatalogController {

    private final StorefrontCatalogService catalogService;

    @GetMapping
    public ResponseEntity<CatalogResponse> getCatalog() {
        return ResponseEntity.ok(catalogService.getCatalog());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String slug) {
        return ResponseEntity.ok(catalogService.getProduct(slug));
    }
}
