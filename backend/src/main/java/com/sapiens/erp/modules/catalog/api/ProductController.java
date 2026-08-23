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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_CREATE')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse response = productService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/products/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_EDIT')")
    public ResponseEntity<ProductResponse> update(@PathVariable UUID id,
                                                   @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_CREATE')")
    public ResponseEntity<List<ProductResponse>> importBulk(@RequestBody List<@Valid ProductRequest> requests) {
        return ResponseEntity.ok(productService.importBulk(requests));
    }

    // ── Imagen del producto (REQ-INV-08) ─────────────────────────────────────

    @PostMapping("/{id}/image")
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_EDIT')")
    public ResponseEntity<ProductResponse> uploadImage(@PathVariable UUID id,
                                                       @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productImageService.upload(id, file));
    }

    /**
     * Público (solo GET): las etiquetas <img> del frontend no pueden enviar el JWT.
     *
     * @param w ancho deseado. La rejilla del catálogo pide 400 y baja de 380 KB
     *          a unas decenas. Sin el parámetro se sirve el original.
     */
    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getImage(
            @PathVariable UUID id,
            @RequestParam(name = "w", required = false, defaultValue = "0") int w,
            @RequestHeader(name = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch
    ) {
        ProductImageService.LoadedImage image = productImageService.load(id, w);
        String etag = "\"" + image.version() + "-" + w + "\"";

        // La URL no lleva hash: si la foto se reemplaza, la dirección es la
        // misma. Por eso la caché es larga PERO revalidada — el navegador
        // pregunta y casi siempre recibe un 304 de unos pocos bytes.
        if (etag.equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic().mustRevalidate())
                .body(image.content());
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasAuthority('CATALOG_PRODUCT_EDIT')")
    public ResponseEntity<ProductResponse> deleteImage(@PathVariable UUID id) {
        return ResponseEntity.ok(productImageService.deleteImage(id));
    }
}
