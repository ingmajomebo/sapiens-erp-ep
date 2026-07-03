package com.sapiens.erp.modules.catalog.api;

import com.sapiens.erp.modules.catalog.api.dto.ProductRequest;
import com.sapiens.erp.modules.catalog.api.dto.ProductResponse;
import com.sapiens.erp.modules.catalog.application.ProductImageService;
import com.sapiens.erp.modules.catalog.application.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductImageService productImageService;

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> listAll(
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(productService.listAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse response = productService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/products/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ProductResponse> update(@PathVariable UUID id,
                                                   @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<List<ProductResponse>> importBulk(@RequestBody List<@Valid ProductRequest> requests) {
        return ResponseEntity.ok(productService.importBulk(requests));
    }

    // ── Imagen del producto (REQ-INV-08) ─────────────────────────────────────

    @PostMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ProductResponse> uploadImage(@PathVariable UUID id,
                                                       @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productImageService.upload(id, file));
    }

    /** Público (solo GET): las etiquetas <img> del frontend no pueden enviar el JWT. */
    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getImage(@PathVariable UUID id) {
        ProductImageService.LoadedImage image = productImageService.load(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)))
                .body(image.content());
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ProductResponse> deleteImage(@PathVariable UUID id) {
        return ResponseEntity.ok(productImageService.deleteImage(id));
    }
}
