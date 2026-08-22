package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.AdminProductRow;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.PublishRequest;
import com.sapiens.erp.modules.storefront.domain.StorefrontProduct;
import com.sapiens.erp.modules.storefront.domain.StorefrontProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Administración de la vitrina: qué productos del ERP se publican y cómo. */
@Service
@RequiredArgsConstructor
public class StorefrontAdminService {

    private final ProductRepository productRepository;
    private final StorefrontProductRepository storefrontProductRepository;
    private final InventoryMovementRepository movementRepository;

    /**
     * Todos los productos vendibles del ERP con su estado de publicación.
     * Es la lista que alimenta la pantalla de vitrina.
     */
    @Transactional(readOnly = true)
    public List<AdminProductRow> listProducts() {
        Map<UUID, StorefrontProduct> published = storefrontProductRepository.findAll().stream()
                .filter(sp -> sp.getDeletedAt() == null)
                .collect(Collectors.toMap(StorefrontProduct::getProductId, Function.identity()));

        return productRepository.findAllByDeletedAtIsNull(Pageable.unpaged()).getContent().stream()
                .filter(Product::isActive)
                .map(product -> toRow(product, published.get(product.getId())))
                .sorted((a, b) -> {
                    // Primero los publicados, luego por nombre
                    if (a.published() != b.published()) return a.published() ? -1 : 1;
                    return a.productName().compareToIgnoreCase(b.productName());
                })
                .toList();
    }

    @Transactional
    public AdminProductRow publish(UUID productId, PublishRequest req) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + productId));

        if (product.getSalePrice() == null) {
            throw new IllegalArgumentException(
                    "El producto no tiene precio de venta: no se puede publicar en la tienda");
        }

        String slug = slugify(req.slug());
        storefrontProductRepository.findBySlugAndDeletedAtIsNull(slug)
                .filter(other -> !other.getProductId().equals(productId))
                .ifPresent(other -> {
                    throw new IllegalArgumentException("Ya hay otro producto con la dirección '" + slug + "'");
                });

        StorefrontProduct entry = storefrontProductRepository.findById(productId)
                .orElseGet(() -> {
                    StorefrontProduct created = new StorefrontProduct();
                    created.setProduct(product);
                    return created;
                });

        entry.setDeletedAt(null);
        entry.setSlug(slug);
        entry.setGroupSlug(slugify(req.groupSlug()));
        entry.setGroupName(req.groupName().trim());
        entry.setAxisPresentation(blankToNull(req.axisPresentation()));
        entry.setAxisSize(req.axisSize().trim());
        entry.setOrigin(blankToNull(req.origin()));
        entry.setDescription(blankToNull(req.description()));
        entry.setConservation(blankToNull(req.conservation()));
        entry.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 100);
        entry.setPublished(req.published());

        return toRow(product, storefrontProductRepository.save(entry));
    }

    /** Quita el producto de la tienda sin borrar su ficha, por si vuelve. */
    @Transactional
    public void unpublish(UUID productId) {
        storefrontProductRepository.findById(productId).ifPresent(entry -> {
            entry.setPublished(false);
            storefrontProductRepository.save(entry);
        });
    }

    /* ── Mapeo ───────────────────────────────────────────────────────────── */

    private AdminProductRow toRow(Product product, StorefrontProduct entry) {
        BigDecimal stock = movementRepository.calculateCurrentStock(product.getId());
        return new AdminProductRow(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getSalePrice(),
                stock,
                entry != null && entry.isPublished(),
                entry != null ? entry.getSlug() : suggestSlug(product.getName()),
                entry != null ? entry.getGroupSlug() : suggestSlug(product.getName()),
                entry != null ? entry.getGroupName() : product.getName(),
                entry != null ? entry.getAxisPresentation() : null,
                entry != null ? entry.getAxisSize() : "Unidad",
                entry != null ? entry.getOrigin() : null,
                entry != null ? entry.getDescription() : product.getDescription(),
                entry != null ? entry.getConservation() : null,
                entry != null ? entry.getSortOrder() : 100
        );
    }

    /** Sugerencia inicial para un producto que nunca se ha publicado. */
    private String suggestSlug(String name) {
        return slugify(name);
    }

    private String slugify(String value) {
        String stripped = Normalizer.normalize(value.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return stripped.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
