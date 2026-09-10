package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.catalog.domain.Category;
import com.sapiens.erp.modules.catalog.domain.CategoryRepository;
import com.sapiens.erp.modules.catalog.application.ProductGalleryService;
import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.domain.StorefrontProduct;
import com.sapiens.erp.modules.storefront.domain.StorefrontProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Catálogo que ve el cliente. Agrupa las presentaciones publicadas por
 * {@code groupSlug} y marca la disponibilidad con el stock real del ERP.
 */
@Service
@RequiredArgsConstructor
public class StorefrontCatalogService {

    private final StorefrontProductRepository storefrontProductRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryMovementRepository movementRepository;
    private final ProductGalleryService galleryService;

    @Transactional(readOnly = true)
    public CatalogResponse getCatalog() {
        List<StorefrontProduct> published = storefrontProductRepository
                .findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscGroupNameAsc();

        // Un solo recorrido: agrupa por familia conservando el orden de la consulta
        Map<String, List<StorefrontProduct>> byGroup = new LinkedHashMap<>();
        for (StorefrontProduct sp : published) {
            byGroup.computeIfAbsent(sp.getGroupSlug(), k -> new ArrayList<>()).add(sp);
        }

        List<ProductResponse> products = byGroup.values().stream()
                .map(this::toProduct)
                .toList();

        List<CategoryResponse> categories = categoryRepository.findAllByDeletedAtIsNull().stream()
                .filter(c -> products.stream().anyMatch(p -> c.getId().toString().equals(p.categoryId())))
                .map(this::toCategory)
                .toList();

        return new CatalogResponse(categories, products);
    }

    /**
     * La tienda navega por el slug del GRUPO ("atun"), que es lo que expone el
     * catálogo. Se acepta además el slug de una presentación concreta
     * ("atun-lomo-400") para que un enlace antiguo o compartido no se rompa.
     */
    @Transactional(readOnly = true)
    public ProductResponse getProduct(String slug) {
        List<StorefrontProduct> group = storefrontProductRepository
                .findAllByGroupSlugAndPublishedTrueAndDeletedAtIsNull(slug);

        if (group.isEmpty()) {
            String groupSlug = storefrontProductRepository.findBySlugAndDeletedAtIsNull(slug)
                    .map(StorefrontProduct::getGroupSlug)
                    .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + slug));
            group = storefrontProductRepository
                    .findAllByGroupSlugAndPublishedTrueAndDeletedAtIsNull(groupSlug);
        }

        if (group.isEmpty()) {
            throw new IllegalArgumentException("Producto no encontrado: " + slug);
        }
        return toProduct(group);
    }

    /* ── Mapeo ───────────────────────────────────────────────────────────── */

    private ProductResponse toProduct(List<StorefrontProduct> group) {
        List<StorefrontProduct> ordered = group.stream()
                .sorted(Comparator.comparing(StorefrontProduct::getSortOrder)
                        .thenComparing(sp -> sp.getProduct().getSalePrice(),
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        StorefrontProduct head = ordered.get(0);
        Product headProduct = head.getProduct();

        List<PresentationResponse> presentations = ordered.stream()
                .map(this::toPresentation)
                .toList();

        boolean anyAvailable = presentations.stream().anyMatch(PresentationResponse::available);

        return new ProductResponse(
                head.getGroupSlug(),
                head.getGroupName(),
                headProduct.getCategory() != null ? headProduct.getCategory().getId().toString() : null,
                head.getOrigin(),
                head.getDescription(),
                head.getConservation(),
                headProduct.getImageUrl(),
                head.getGroupName(),
                galleryOf(ordered),
                presentations,
                anyAvailable,
                head.getSortOrder()
        );
    }

    /**
     * Reúne las fotos de TODAS las presentaciones del grupo, no solo de la
     * primera.
     *
     * <p>El motivo es del negocio: "Salmón" es un grupo cuyas presentaciones
     * son filete, posta y entero. Las fotos del entero describen el mismo
     * producto y el comprador espera verlas en la misma ficha. Se conserva el
     * orden de las presentaciones y, dentro de cada una, el de sus imágenes.
     */
    private List<GalleryImageResponse> galleryOf(List<StorefrontProduct> ordered) {
        List<UUID> productIds = ordered.stream().map(sp -> sp.getProduct().getId()).toList();
        Map<UUID, List<ProductGalleryService.GalleryImage>> byProduct =
                galleryService.listByProducts(productIds);

        List<GalleryImageResponse> images = new ArrayList<>();
        Set<String> vistas = new HashSet<>();
        for (UUID id : productIds) {
            for (ProductGalleryService.GalleryImage img : byProduct.getOrDefault(id, List.of())) {
                // Dos presentaciones podrían compartir foto; repetirla en la
                // galería obligaría al comprador a pasar dos veces por lo mismo.
                if (vistas.add(img.url())) {
                    images.add(new GalleryImageResponse(
                            img.id().toString(), img.role(), img.url(), img.alt()));
                }
            }
        }
        return images;
    }

    private PresentationResponse toPresentation(StorefrontProduct sp) {
        Product product = sp.getProduct();
        BigDecimal stock = movementRepository.calculateCurrentStock(product.getId());
        boolean available = product.isActive()
                && product.getSalePrice() != null
                && stock.compareTo(BigDecimal.ZERO) > 0;

        return new PresentationResponse(
                product.getId(),
                sp.variantName(),
                sp.getAxisPresentation(),
                sp.getAxisSize(),
                product.getSalePrice(),
                available
        );
    }

    private CategoryResponse toCategory(Category c) {
        return new CategoryResponse(c.getId().toString(), c.getName(), c.getDescription());
    }
}
