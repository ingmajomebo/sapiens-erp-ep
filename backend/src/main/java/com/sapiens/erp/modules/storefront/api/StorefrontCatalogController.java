package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.CatalogResponse;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.CategoryHeroResponse;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.CategoryPageResponse;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.ProductResponse;
import com.sapiens.erp.modules.storefront.application.StorefrontCatalogService;
import com.sapiens.erp.modules.storefront.application.StorefrontCategoryPageService;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Catálogo de la tienda. Sin autenticación. */
@RestController
@RequestMapping("/api/v1/public/catalog")
@RequiredArgsConstructor
public class StorefrontCatalogController {

    private final StorefrontCatalogService catalogService;
    private final StorefrontCategoryPageService categoryPageService;

    @GetMapping
    public ResponseEntity<CatalogResponse> getCatalog() {
        return ResponseEntity.ok(catalogService.getCatalog());
    }

    /** Portadas publicadas, para la navegación de la tienda. */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryHeroResponse>> getCategories() {
        return ResponseEntity.ok(categoryPageService.getCategories());
    }

    /**
     * La página completa de una categoría: portada, migas y presentaciones.
     * Va antes que /{slug} porque este último capturaría "categories".
     */
    @GetMapping("/categories/{slug}")
    public ResponseEntity<CategoryPageResponse> getCategoryPage(@PathVariable String slug) {
        return ResponseEntity.ok(categoryPageService.getPage(slug));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String slug) {
        return ResponseEntity.ok(catalogService.getProduct(slug));
    }
}
