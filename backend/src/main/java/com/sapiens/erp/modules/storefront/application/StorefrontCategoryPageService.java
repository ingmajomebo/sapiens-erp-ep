package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Arma la página de una categoría del catálogo: portada, migas y presentaciones.
 * <p>
 * Un ítem es una PRESENTACIÓN, no una familia: es lo que tiene precio y stock
 * propios y lo que el cliente compara sin entrar a la ficha.
 * <p>
 * Las opciones de filtro no se calculan aquí a propósito. Viajan implícitas en
 * los atributos de cada ítem y el cliente las deriva: así nunca puede aparecer
 * una opción que no exista, y los contadores siempre concuerdan con la rejilla.
 */
@Service
@RequiredArgsConstructor
public class StorefrontCategoryPageService {

    private static final BigDecimal MIL = BigDecimal.valueOf(1000);

    private final StorefrontProductRepository productRepository;
    private final StorefrontCategoryRepository categoryRepository;
    private final StorefrontProductAttributeRepository attributeRepository;
    private final StorefrontAttributeDefinitionRepository definitionRepository;
    private final InventoryMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public CategoryPageResponse getPage(String slug) {
        StorefrontCategory category = categoryRepository
                .findBySlugAndPublishedTrueAndDeletedAtIsNull(slug)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada: " + slug));

        List<StorefrontProduct> published = productRepository
                .findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscGroupNameAsc();

        List<StorefrontProduct> alcance = published.stream()
                .filter(sp -> perteneceA(sp, category))
                .toList();

        // Un solo viaje por los atributos de todo el alcance, no uno por ítem
        Map<UUID, Map<String, List<String>>> atributos = cargarAtributos(alcance);

        List<CatalogItemResponse> items = alcance.stream()
                .map(sp -> toItem(sp, atributos.getOrDefault(sp.getProductId(), Map.of())))
                .toList();

        return new CategoryPageResponse(
                toHero(category),
                migas(category),
                items,
                definitionRepository.findAllByOrderBySortOrderAscLabelAsc().stream()
                        .map(d -> new AttributeDefinitionResponse(
                                d.getAttributeKey(), d.getLabel(), d.isFilterable(), d.getSortOrder()))
                        .toList(),
                categoryRepository
                        .findAllByParentSlugAndPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc(slug)
                        .stream().map(this::toHero).toList()
        );
    }

    /** Las portadas publicadas, para la navegación y el mapa del sitio. */
    @Transactional(readOnly = true)
    public List<CategoryHeroResponse> getCategories() {
        return categoryRepository.findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscTitleAsc()
                .stream().map(this::toHero).toList();
    }

    /* ── Alcance ─────────────────────────────────────────────────────────── */

    /**
     * Qué presentaciones entran en esta página. Cada tipo de portada mira un
     * campo distinto, y ninguno depende del nombre del producto.
     */
    private boolean perteneceA(StorefrontProduct sp, StorefrontCategory category) {
        Product p = sp.getProduct();
        return switch (category.getKind()) {
            case SPECIES -> category.getGroupSlug().equals(sp.getGroupSlug());
            case CATEGORY -> p.getCategory() != null
                    && p.getCategory().getId().equals(category.getCategoryId());
            case SUBCATEGORY -> p.getSubcategory() != null
                    && p.getSubcategory().getId().equals(category.getSubcategoryId());
        };
    }

    private Map<UUID, Map<String, List<String>>> cargarAtributos(List<StorefrontProduct> alcance) {
        if (alcance.isEmpty()) return Map.of();

        List<UUID> ids = alcance.stream().map(StorefrontProduct::getProductId).toList();
        Map<UUID, Map<String, List<String>>> porProducto = new HashMap<>();

        for (StorefrontProductAttribute a : attributeRepository.findAllByProductIdIn(ids)) {
            porProducto
                    .computeIfAbsent(a.getProductId(), k -> new LinkedHashMap<>())
                    .computeIfAbsent(a.getAttributeKey(), k -> new ArrayList<>())
                    .add(a.getAttributeValue());
        }
        return porProducto;
    }

    /* ── Mapeo ───────────────────────────────────────────────────────────── */

    private CatalogItemResponse toItem(StorefrontProduct sp, Map<String, List<String>> attrs) {
        Product p = sp.getProduct();
        BigDecimal stock = movementRepository.calculateCurrentStock(p.getId());

        return new CatalogItemResponse(
                p.getId(),
                sp.getSlug(),
                sp.getGroupSlug(),
                sp.getGroupName(),
                sp.variantName(),
                sp.getAxisPresentation(),
                sp.getAxisSize(),
                p.getSalePrice(),
                precioPorKilo(p.getSalePrice(), sp.weightInGrams()),
                sp.getWeightValue(),
                sp.getWeightUnit() == null ? null : sp.getWeightUnit().name(),
                sp.getOrigin(),
                sp.getOriginKind() == null ? null : sp.getOriginKind().name(),
                p.getImageUrl(),
                sp.getSecondaryImagePath() == null
                        ? null
                        : "/api/v1/products/" + p.getId() + "/image/secondary",
                sp.getGroupName() + " · " + sp.variantName(),
                disponibilidad(p, stock),
                attrs,
                p.getCategory() != null ? p.getCategory().getId().toString() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getSubcategory() != null ? p.getSubcategory().getId().toString() : null,
                p.getSubcategory() != null ? p.getSubcategory().getName() : null,
                sp.getSortOrder(),
                sp.getCreatedAt()
        );
    }

    /**
     * Tres niveles usando el umbral que el ERP ya mantiene para reponer. Un
     * producto sin precio no se puede vender aunque tenga existencias.
     */
    private Availability disponibilidad(Product p, BigDecimal stock) {
        if (!p.isActive() || p.getSalePrice() == null || stock.compareTo(BigDecimal.ZERO) <= 0) {
            return Availability.OUT_OF_STOCK;
        }
        BigDecimal minimo = p.getMinimumStock();
        boolean escaso = minimo != null
                && minimo.compareTo(BigDecimal.ZERO) > 0
                && stock.compareTo(minimo) <= 0;
        return escaso ? Availability.LOW_STOCK : Availability.AVAILABLE;
    }

    /** Null cuando la unidad no es masa: forzar un número ahí sería mentir. */
    private BigDecimal precioPorKilo(BigDecimal price, BigDecimal grams) {
        if (price == null || grams == null || grams.compareTo(BigDecimal.ZERO) <= 0) return null;
        return price.multiply(MIL).divide(grams, 0, RoundingMode.HALF_UP);
    }

    private CategoryHeroResponse toHero(StorefrontCategory c) {
        return new CategoryHeroResponse(
                c.getSlug(),
                c.getKind().name(),
                c.getParentSlug(),
                c.getTitle(),
                c.getDescription(),
                c.getBannerPath(),
                c.getBannerAlt()
        );
    }

    /** Migas construidas desde `parent_slug`: es un dato, no una cadena de ifs. */
    private List<BreadcrumbResponse> migas(StorefrontCategory category) {
        Deque<BreadcrumbResponse> ruta = new ArrayDeque<>();
        StorefrontCategory actual = category;
        Set<String> vistos = new HashSet<>();

        // El corte por `vistos` protege de un padre mal configurado en ciclo
        while (actual != null && vistos.add(actual.getSlug())) {
            ruta.addFirst(new BreadcrumbResponse(actual.getTitle(), actual.path()));
            actual = actual.getParentSlug() == null ? null
                    : categoryRepository.findBySlugAndDeletedAtIsNull(actual.getParentSlug()).orElse(null);
        }
        ruta.addFirst(new BreadcrumbResponse("Inicio", "/"));
        return new ArrayList<>(ruta);
    }
}
