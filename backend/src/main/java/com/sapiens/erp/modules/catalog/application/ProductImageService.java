package com.sapiens.erp.modules.catalog.application;

import com.sapiens.erp.modules.catalog.api.dto.ProductResponse;
import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Imagen de producto en almacenamiento local configurable (app.uploads.products-dir),
 * siguiendo el patrón de evidencias QA. JPG/JPEG/PNG/WEBP, máximo 5MB (convención del proyecto).
 * Al reemplazar o quitar la imagen se elimina el archivo anterior gestionado (sin huérfanos).
 */
@Service
@RequiredArgsConstructor
public class ProductImageService {

    private static final Logger log = LoggerFactory.getLogger(ProductImageService.class);
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Map<String, String> CONTENT_TYPE_BY_EXTENSION = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    private final ProductRepository productRepository;
    private final ProductThumbnailService thumbnailService;

    @Value("${app.uploads.products-dir:uploads/products}")
    private String uploadsDir;

    @Transactional
    public ProductResponse upload(UUID productId, MultipartFile file) {
        Product product = findActive(productId);

        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("La imagen supera el máximo de 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Formato no permitido (solo JPG, JPEG, PNG o WEBP): " + contentType);
        }

        String extension = extensionFor(contentType, file.getOriginalFilename());
        try {
            Path dir = Paths.get(uploadsDir);
            Files.createDirectories(dir);
            Path target = dir.resolve(productId + "_" + UUID.randomUUID() + "." + extension);
            file.transferTo(target.toAbsolutePath());

            deleteManagedFileIfAny(product);
            product.setImagePath(target.toString());
            product.setImageUrl("/api/v1/products/" + productId + "/image");
            productRepository.save(product);
            log.info("Imagen de producto guardada: {} ({} bytes) para producto {}",
                    target.getFileName(), file.getSize(), productId);
            return ProductResponse.from(product);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la imagen del producto", e);
        }
    }

    @Transactional(readOnly = true)
    public LoadedImage load(UUID productId) {
        return load(productId, 0);
    }

    /**
     * @param width ancho deseado en px, o 0 para el original. Si la miniatura
     *              no se puede generar se devuelve el original: una foto
     *              pesada es mejor que ninguna foto.
     */
    public LoadedImage load(UUID productId, int width) {
        Product product = findActive(productId);
        if (product.getImagePath() == null) {
            // 404: el recurso imagen no existe para este producto
            throw new ProductNotFoundException(productId);
        }
        try {
            Path path = Paths.get(product.getImagePath());

            if (width > 0) {
                byte[] thumb = thumbnailService.thumbnail(path, thumbnailService.normalize(width));
                if (thumb != null) {
                    return new LoadedImage("image/jpeg", thumb, versionOf(path));
                }
            }

            byte[] content = Files.readAllBytes(path);
            return new LoadedImage(contentTypeFor(path), content, versionOf(path));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer la imagen del producto " + productId, e);
        }
    }

    @Transactional
    public ProductResponse deleteImage(UUID productId) {
        Product product = findActive(productId);
        deleteManagedFileIfAny(product);
        product.setImagePath(null);
        product.setImageUrl(null);
        return ProductResponse.from(productRepository.save(product));
    }

    /**
     * Si el producto pasa a usar una URL externa (o ninguna) desde el PUT estándar,
     * el archivo local anterior se elimina para no dejar huérfanos.
     */
    @Transactional
    public void releaseManagedFileIfExternalUrl(Product product, String newImageUrl) {
        boolean pointsToManagedEndpoint = newImageUrl != null
                && newImageUrl.equals("/api/v1/products/" + product.getId() + "/image");
        if (product.getImagePath() != null && !pointsToManagedEndpoint) {
            deleteManagedFileIfAny(product);
            product.setImagePath(null);
        }
    }

    private void deleteManagedFileIfAny(Product product) {
        if (product.getImagePath() == null) return;
        try {
            Files.deleteIfExists(Paths.get(product.getImagePath()));
        } catch (IOException e) {
            // No bloquear la operación de negocio por un archivo que no se pudo borrar
            log.warn("No se pudo eliminar la imagen anterior {}: {}", product.getImagePath(), e.getMessage());
        }
    }

    private Product findActive(UUID id) {
        return productRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    private String extensionFor(String contentType, String originalName) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
            if (CONTENT_TYPE_BY_EXTENSION.containsKey(ext)) return ext;
        }
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    private String contentTypeFor(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        String ext = name.substring(name.lastIndexOf('.') + 1);
        return CONTENT_TYPE_BY_EXTENSION.getOrDefault(ext, "application/octet-stream");
    }

    /**
     * Huella del archivo para el ETag. Con ella el navegador pregunta "¿cambió?"
     * y recibe un 304 de unos pocos bytes en vez de la foto entera.
     */
    private String versionOf(Path path) {
        try {
            return Files.getLastModifiedTime(path).toMillis() + "-" + Files.size(path);
        } catch (IOException e) {
            return "0";
        }
    }

    public record LoadedImage(String contentType, byte[] content, String version) {}
}
