package com.sapiens.erp.modules.catalog.application;

import com.sapiens.erp.modules.catalog.api.dto.SubcategoryResponse;
import com.sapiens.erp.modules.catalog.domain.Category;
import com.sapiens.erp.modules.catalog.domain.CategoryRepository;
import com.sapiens.erp.modules.catalog.domain.Subcategory;
import com.sapiens.erp.modules.catalog.domain.SubcategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubcategoryService {

    private final SubcategoryRepository subcategoryRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Con {@code categoryId} devuelve solo las subcategorías de esa categoría —
     * que es como las consume el selector del formulario de producto.
     */
    @Transactional(readOnly = true)
    public List<SubcategoryResponse> list(UUID categoryId) {
        List<Subcategory> found = categoryId != null
                ? subcategoryRepository.findAllByCategoryIdAndDeletedAtIsNullOrderByNameAsc(categoryId)
                : subcategoryRepository.findAllByDeletedAtIsNullOrderByNameAsc();
        return found.stream().map(SubcategoryResponse::from).toList();
    }

    @Transactional
    public SubcategoryResponse create(UUID categoryId, String name, String description) {
        Category category = categoryRepository.findById(categoryId)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));

        String trimmed = name != null ? name.trim() : "";
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Subcategory name is required");
        }
        // El nombre es único dentro de la categoría, no globalmente
        if (subcategoryRepository.existsByCategoryIdAndNameIgnoreCaseAndDeletedAtIsNull(categoryId, trimmed)) {
            throw new IllegalArgumentException(
                    "Subcategory '" + trimmed + "' already exists under category '" + category.getName() + "'");
        }

        Subcategory saved = subcategoryRepository.save(Subcategory.create(category, trimmed, description));
        return SubcategoryResponse.from(saved);
    }
}
