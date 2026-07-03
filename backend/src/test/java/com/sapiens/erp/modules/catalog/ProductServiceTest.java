package com.sapiens.erp.modules.catalog;

import com.sapiens.erp.modules.catalog.api.dto.ProductRequest;
import com.sapiens.erp.modules.catalog.api.dto.ProductResponse;
import com.sapiens.erp.modules.catalog.application.ProductService;
import com.sapiens.erp.modules.catalog.domain.*;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductService")
class ProductServiceTest {

    @Mock ProductRepository productRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock com.sapiens.erp.modules.catalog.application.ProductImageService productImageService;
    @InjectMocks ProductService service;

    private UUID productId;
    private UUID categoryId;
    private Category category;
    private Product product;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        category = Category.create("Fresh Fish", "Fresh catches");
        product = Product.create("Atlantic Salmon", category, UnitOfMeasure.KG, new BigDecimal("2.000"), "Premium salmon");
    }

    private static ProductRequest minimalRequest(String name, UUID catId, UnitOfMeasure unit, BigDecimal minStock, String desc) {
        return new ProductRequest(name, catId, unit, minStock, desc, null, null, null, null, null, null, null, null, null);
    }

    @Nested
    @DisplayName("create()")
    class Create {

        @Test
        @DisplayName("creates product when name is unique")
        void createsProduct() {
            ProductRequest req = minimalRequest("Atlantic Salmon", categoryId, UnitOfMeasure.KG, new BigDecimal("2.000"), "desc");
            when(productRepository.existsByNameIgnoreCaseAndDeletedAtIsNull("Atlantic Salmon")).thenReturn(false);
            when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
            when(productRepository.save(any())).thenReturn(product);

            ProductResponse response = service.create(req);

            assertThat(response.name()).isEqualTo("Atlantic Salmon");
            verify(productRepository).save(any(Product.class));
        }

        @Test
        @DisplayName("throws when name already exists")
        void throwsOnDuplicateName() {
            ProductRequest req = minimalRequest("Atlantic Salmon", null, UnitOfMeasure.KG, BigDecimal.ZERO, null);
            when(productRepository.existsByNameIgnoreCaseAndDeletedAtIsNull("Atlantic Salmon")).thenReturn(true);

            assertThatThrownBy(() -> service.create(req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Atlantic Salmon");
        }

        @Test
        @DisplayName("throws when category not found")
        void throwsOnCategoryNotFound() {
            ProductRequest req = minimalRequest("New Fish", categoryId, UnitOfMeasure.KG, BigDecimal.ZERO, null);
            when(productRepository.existsByNameIgnoreCaseAndDeletedAtIsNull("New Fish")).thenReturn(false);
            when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.create(req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Category not found");
        }
    }

    @Nested
    @DisplayName("findById()")
    class FindById {

        @Test
        @DisplayName("returns product when found")
        void returnsProduct() {
            when(productRepository.findByIdAndDeletedAtIsNull(productId)).thenReturn(Optional.of(product));
            ProductResponse response = service.findById(productId);
            assertThat(response.name()).isEqualTo("Atlantic Salmon");
        }

        @Test
        @DisplayName("throws ProductNotFoundException when not found")
        void throwsWhenNotFound() {
            when(productRepository.findByIdAndDeletedAtIsNull(productId)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.findById(productId))
                    .isInstanceOf(ProductNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("listAll()")
    class ListAll {

        @Test
        @DisplayName("returns paginated list")
        void returnsPaginatedList() {
            when(productRepository.findAllByDeletedAtIsNull(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(product)));

            var page = service.listAll(Pageable.unpaged());

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).name()).isEqualTo("Atlantic Salmon");
        }
    }

    @Nested
    @DisplayName("delete()")
    class Delete {

        @Test
        @DisplayName("soft-deletes product")
        void softDeletes() {
            when(productRepository.findByIdAndDeletedAtIsNull(productId)).thenReturn(Optional.of(product));

            service.delete(productId);

            assertThat(product.isActive()).isFalse();
            assertThat(product.getDeletedAt()).isNotNull();
        }

        @Test
        @DisplayName("throws when product not found")
        void throwsWhenNotFound() {
            when(productRepository.findByIdAndDeletedAtIsNull(productId)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.delete(productId))
                    .isInstanceOf(ProductNotFoundException.class);
        }
    }
}
