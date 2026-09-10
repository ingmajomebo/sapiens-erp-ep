package com.sapiens.erp.modules.catalog.application;

import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * La galería de fotos de un producto: varias imágenes con rol y orden.
 *
 * <p>Convive con {@link ProductImageService}, que gestiona la foto única
 * heredada (`products.image_path`). No se fusionan todavía a propósito: el
 * catálogo entero y la tienda dependen de esa columna, y migrarla es un paso
 * aparte con su propio script. Mientras tanto, un producto puede tener foto
 * antigua, galería, o las dos.
 *
 * <p>El archivo se nombra con un identificador propio, nunca con el nombre que
 * subió el usuario: un nombre como "../../etc/passwd" escribiría fuera del
 * directorio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductGalleryService {

    private static final long MAX_SIZE_BYTES = 8 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");
    private static final Map<String, String> EXTENSION_BY_TYPE = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");
    private static final Map<String, String> TYPE_BY_EXTENSION = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    /** Tope de fotos por producto. Una ficha con veinte imágenes no se navega. */
    private static final int MAX_IMAGES = 12;

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;

    @Value("${app.uploads.products-dir:uploads/products}")
    private String uploadsDir;

    public record GalleryImage(UUID id, String role, String url, String alt, int displayOrder,
                                Integer width, Integer height) {}

    public record LoadedBytes(String contentType, byte[] content, String version) {}

    /* ── Lectura ─────────────────────────────────────────────────────────── */

    @Transactional(readOnly = true)
    public List<GalleryImage> listByProduct(UUID productId) {
        return imageRepository.findVisibleByProduct(productId).stream()
                .map(ProductGalleryService::toDto)
                .toList();
    }

    /** Agrupadas por producto, para pintar un listado sin una consulta por fila. */
    @Transactional(readOnly = true)
    public Map<UUID, List<GalleryImage>> listByProducts(Collection<UUID> productIds) {
        if (productIds.isEmpty()) return Map.of();
        Map<UUID, List<GalleryImage>> byProduct = new LinkedHashMap<>();
        for (ProductImage img : imageRepository.findVisibleByProducts(productIds)) {
            byProduct.computeIfAbsent(img.getProduct().getId(), k -> new ArrayList<>())
                     .add(toDto(img));
        }
        return byProduct;
    }

    public LoadedBytes load(UUID imageId) {
        ProductImage image = imageRepository.findByIdAndDeletedAtIsNull(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Imagen no encontrada: " + imageId));
        Path path = pathOf(image.getStorageKey());
        try {
            byte[] content = Files.readAllBytes(path);
            return new LoadedBytes(contentTypeOf(image.getStorageKey()), content,
                    String.valueOf(Files.getLastModifiedTime(path).toMillis()));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer la imagen " + imageId, e);
        }
    }

    /* ── Escritura ───────────────────────────────────────────────────────── */

    @Transactional
    public GalleryImage upload(UUID productId, MultipartFile file, ProductImageRole role,
                                String altText, Integer displayOrder) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        validate(file);

        List<ProductImage> existing = imageRepository.findVisibleByProduct(productId);
        if (existing.size() >= MAX_IMAGES) {
            throw new IllegalArgumentException(
                    "El producto ya tiene " + MAX_IMAGES + " fotos, que es el máximo.");
        }

        ProductImageRole finalRole = role != null ? role : ProductImageRole.GALLERY;

        // PRINCIPAL y HOVER son únicas. La base lo impide con un índice, pero
        // fallar con una violación de restricción no le dice nada al operador:
        // aquí se retira la anterior y se explica en el log.
        if (finalRole != ProductImageRole.GALLERY) {
            imageRepository.findByProductAndRole(productId, finalRole).ifPresent(previous -> {
                previous.setRole(ProductImageRole.GALLERY);
                imageRepository.save(previous);
                log.info("La foto {} deja de ser {} y pasa a la galería", previous.getId(), finalRole);
            });
        }

        String contentType = Objects.requireNonNull(file.getContentType());
        String storageKey = productId + "_" + UUID.randomUUID() + "."
                + EXTENSION_BY_TYPE.get(contentType);

        int order = displayOrder != null ? displayOrder : existing.size();
        ProductImage image = ProductImage.create(product, finalRole, storageKey,
                file.getOriginalFilename(), altText, order);

        try {
            Path dir = Paths.get(uploadsDir);
            Files.createDirectories(dir);
            Path target = dir.resolve(storageKey);
            file.transferTo(target.toAbsolutePath());

            // Las dimensiones se leen del archivo ya escrito, no de lo que
            // declare quien sube: un cliente puede mentir en el formulario.
            var read = ImageIO.read(target.toFile());
            image.markReady(read != null ? read.getWidth() : null,
                            read != null ? read.getHeight() : null,
                            (int) Math.min(file.getSize(), Integer.MAX_VALUE));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la foto del producto", e);
        }

        imageRepository.save(image);
        log.info("Foto {} guardada para el producto {} ({} bytes)",
                finalRole, productId, file.getSize());
        return toDto(image);
    }

    @Transactional
    public void delete(UUID imageId) {
        ProductImage image = imageRepository.findByIdAndDeletedAtIsNull(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Imagen no encontrada: " + imageId));
        image.softDelete();
        imageRepository.save(image);

        // El archivo se borra después del registro: si falla el borrado físico
        // queda un huérfano en disco, que es preferible a una fila apuntando a
        // un archivo que ya no existe.
        try {
            Files.deleteIfExists(pathOf(image.getStorageKey()));
        } catch (IOException e) {
            log.warn("La foto {} se retiró del catálogo pero su archivo sigue en disco: {}",
                    imageId, e.getMessage());
        }
    }

    /* ── Detalles ────────────────────────────────────────────────────────── */

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("La foto supera el máximo de 8MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Formato no permitido (solo JPG, PNG o WEBP): " + contentType);
        }
    }

    /** La ruta sale SOLO del storage key, que lo generó el sistema. */
    private Path pathOf(String storageKey) {
        return Paths.get(uploadsDir).resolve(storageKey);
    }

    private static String contentTypeOf(String storageKey) {
        int dot = storageKey.lastIndexOf('.');
        String ext = dot < 0 ? "" : storageKey.substring(dot + 1).toLowerCase();
        return TYPE_BY_EXTENSION.getOrDefault(ext, "application/octet-stream");
    }

    private static GalleryImage toDto(ProductImage i) {
        return new GalleryImage(i.getId(), i.getRole().name(),
                "/api/v1/products/images/" + i.getId(),
                i.getAltText(), i.getDisplayOrder(),
                i.getOriginalWidth(), i.getOriginalHeight());
    }
}
