package com.sapiens.erp.modules.catalog.application;

import com.sapiens.erp.modules.catalog.api.dto.ProductRequest;
import com.sapiens.erp.modules.catalog.api.dto.ProductResponse;
import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final ProductImageService productImageService;
    private final WarehouseRepository warehouseRepository;

    @Transactional(readOnly = true)
    public Page<ProductResponse> listAll(Pageable pageable) {
        return productRepository.findAllByDeletedAtIsNull(pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(UUID id) {
        return productRepository.findByIdAndDeletedAtIsNull(id)
                .map(ProductResponse::from)
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        if (productRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(request.name())) {
            throw new IllegalArgumentException("A product with the name '" + request.name() + "' already exists");
        }

        String sku = resolveSkuForCreate(request.sku());

        Category category = resolveCategory(request.categoryId());
        Product product = Product.create(
                request.name(),
                category,
                request.unitOfMeasure(),
                request.minimumStock(),
                request.description()
        );
        applyExtendedFields(product, request);
        product.setSubcategory(resolveSubcategory(request.subcategoryId(), category));
        product.setSku(sku);

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse update(UUID id, ProductRequest request) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        if (productRepository.existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(request.name(), id)) {
            throw new IllegalArgumentException("A product with the name '" + request.name() + "' already exists");
        }

        if (request.sku() != null && !request.sku().isBlank()) {
            String trimmedSku = request.sku().trim();
            if (productRepository.existsBySkuIgnoreCaseAndDeletedAtIsNullAndIdNot(trimmedSku, id)) {
                throw new IllegalArgumentException("A product with the SKU '" + trimmedSku + "' already exists");
            }
        }

        product.setName(request.name());
        Category category = resolveCategory(request.categoryId());
        product.setCategory(category);
        product.setSubcategory(resolveSubcategory(request.subcategoryId(), category));
        product.setUnitOfMeasure(request.unitOfMeasure() != null ? request.unitOfMeasure() : product.getUnitOfMeasure());
        product.setMinimumStock(request.minimumStock() != null ? request.minimumStock() : product.getMinimumStock());
        product.setDescription(request.description());
        applyExtendedFields(product, request);

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public void delete(UUID id) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        product.deactivate();
        productRepository.save(product);
    }

    @Transactional
    public List<ProductResponse> importBulk(List<ProductRequest> requests) {
        return requests.stream()
                .map(req -> {
                    try {
                        return create(req);
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private String resolveSkuForCreate(String requestedSku) {
        if (requestedSku == null || requestedSku.isBlank()) {
            return generateSku();
        }
        String sku = requestedSku.trim();
        if (productRepository.existsBySkuIgnoreCaseAndDeletedAtIsNull(sku)) {
            throw new IllegalArgumentException("A product with the SKU '" + sku + "' already exists");
        }
        return sku;
    }

    private String generateSku() {
        long seq = productRepository.nextSkuSequenceValue();
        return String.format("PRO-%06d", seq);
    }

    private void applyExtendedFields(Product product, ProductRequest request) {
        if (request.sku() != null) product.setSku(request.sku().isBlank() ? null : request.sku().trim());
        if (request.barcode() != null) product.setBarcode(request.barcode().isBlank() ? null : request.barcode().trim());
        if (request.productType() != null) product.setProductType(request.productType());
        if (request.purchaseCost() != null) product.setPurchaseCost(request.purchaseCost());
        if (request.salePrice() != null) product.setSalePrice(request.salePrice());
        if (request.inventoryTrackingEnabled() != null) product.setInventoryTrackingEnabled(request.inventoryTrackingEnabled());
        if (request.warehouseId() != null) {
            warehouseRepository.findByIdAndDeletedAtIsNull(request.warehouseId()).ifPresent(w -> {
                product.setWarehouse(w);
                product.setDefaultWarehouse(w.getName());
            });
        } else if (request.defaultWarehouse() != null) {
            product.setDefaultWarehouse(request.defaultWarehouse().isBlank() ? null : request.defaultWarehouse().trim());
        }
        if (request.imageUrl() != null) {
            String newUrl = request.imageUrl().isBlank() ? null : request.imageUrl().trim();
            // Sin huérfanos: si deja de apuntar al archivo gestionado, se elimina del disco
            productImageService.releaseManagedFileIfExternalUrl(product, newUrl);
            product.setImageUrl(newUrl);
        }

        if (request.status() != null) {
            product.setStatus(request.status());
            product.setActive(request.status() == ProductStatus.ACTIVE);
        }
    }

    /**
     * La subcategoría es opcional, pero si viene debe pertenecer a la categoría
     * del producto: si no, quedarían pares (categoría, subcategoría) imposibles.
     */
    private Subcategory resolveSubcategory(UUID subcategoryId, Category category) {
        if (subcategoryId == null) return null;
        Subcategory subcategory = subcategoryRepository.findById(subcategoryId)
                .filter(sc -> sc.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Subcategory not found: " + subcategoryId));
        if (category == null || !subcategory.getCategory().getId().equals(category.getId())) {
            throw new IllegalArgumentException(
                    "Subcategory '" + subcategory.getName() + "' does not belong to the selected category");
        }
        return subcategory;
    }

    private Category resolveCategory(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
    }
}
