package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.catalog.domain.Category;
import com.sapiens.erp.modules.catalog.domain.CategoryRepository;
import com.sapiens.erp.modules.catalog.application.ProductGalleryService;
import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.domain.StorefrontProduct;
import com.sapiens.erp.modules.sales.domain.SalesInvoiceRepository;
import com.sapiens.erp.modules.storefront.domain.StorefrontProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.stream.Collectors;
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
    private final SalesInvoiceRepository invoiceRepository;

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
     * Los grupos que más unidades vendieron, para la portada.
     *
     * <p>Sale de las facturas reales, no de un orden escrito a mano. Antes la
     * portada decía "lo que más sale esta semana" mostrando los primeros por
     * `sortOrder`: un texto que afirmaba algo que el dato no respaldaba.
     *
     * <p>Cuando no hay ventas suficientes —tienda recién abierta, o un producto
     * nuevo— se completa con el orden de vitrina hasta llenar el carrusel. Un
     * carrusel con dos tarjetas se ve roto, y esconder la sección entera dejaría
     * la portada vacía justo cuando más hace falta enseñar producto.
     *
     * @param limit cuántos grupos devolver
     * @param dias  ventana de tiempo que se considera "reciente"
     */
    @Transactional(readOnly = true)
    public BestSellersResponse getBestSellers(int limit, int dias) {
        Instant desde = Instant.now().minus(Duration.ofDays(dias));

        Map<UUID, BigDecimal> unidadesPorProducto = new HashMap<>();
        for (Object[] fila : invoiceRepository.findUnitsSoldByProductSince(desde)) {
            unidadesPorProducto.put((UUID) fila[0], (BigDecimal) fila[1]);
        }

        List<StorefrontProduct> publicados = storefrontProductRepository
                .findAllByPublishedTrueAndDeletedAtIsNullOrderBySortOrderAscGroupNameAsc();

        Map<String, List<StorefrontProduct>> porGrupo = new LinkedHashMap<>();
        for (StorefrontProduct sp : publicados) {
            porGrupo.computeIfAbsent(sp.getGroupSlug(), k -> new ArrayList<>()).add(sp);
        }

        // Las ventas se suman POR GRUPO: la tienda vende "Salmón", y que se
        // haya ido en filete o en posta es la misma preferencia del comprador.
        Map<String, BigDecimal> unidadesPorGrupo = new HashMap<>();
        porGrupo.forEach((slug, presentaciones) -> {
            BigDecimal total = presentaciones.stream()
                    .map(sp -> unidadesPorProducto.getOrDefault(sp.getProduct().getId(), BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.compareTo(BigDecimal.ZERO) > 0) unidadesPorGrupo.put(slug, total);
        });

        List<String> ordenados = unidadesPorGrupo.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .limit(limit)
                .collect(Collectors.toCollection(ArrayList::new));

        int conVentas = ordenados.size();

        // Relleno con el orden de vitrina, sin repetir
        for (String slug : porGrupo.keySet()) {
            if (ordenados.size() >= limit) break;
            if (!ordenados.contains(slug)) ordenados.add(slug);
        }

        List<ProductResponse> products = ordenados.stream()
                .map(slug -> toProduct(porGrupo.get(slug)))
                .toList();

        return new BestSellersResponse(products, conVentas, dias);
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
