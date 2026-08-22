package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.AdminProductRow;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.PublishRequest;
import com.sapiens.erp.modules.storefront.application.StorefrontAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Vitrina de la tienda, desde el panel del ERP. */
@RestController
@RequestMapping("/api/v1/storefront-products")
@RequiredArgsConstructor
public class StorefrontAdminController {

    private final StorefrontAdminService adminService;

    @GetMapping
    @PreAuthorize("hasAuthority('SALES_STOREFRONT_MANAGE')")
    public ResponseEntity<List<AdminProductRow>> list() {
        return ResponseEntity.ok(adminService.listProducts());
    }

    @PutMapping("/{productId}")
    @PreAuthorize("hasAuthority('SALES_STOREFRONT_MANAGE')")
    public ResponseEntity<AdminProductRow> publish(@PathVariable UUID productId,
                                                   @Valid @RequestBody PublishRequest req) {
        return ResponseEntity.ok(adminService.publish(productId, req));
    }

    @DeleteMapping("/{productId}")
    @PreAuthorize("hasAuthority('SALES_STOREFRONT_MANAGE')")
    public ResponseEntity<Void> unpublish(@PathVariable UUID productId) {
        adminService.unpublish(productId);
        return ResponseEntity.noContent().build();
    }
}
