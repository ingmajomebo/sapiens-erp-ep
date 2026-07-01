package com.sapiens.erp.modules.catalog.api;

import com.sapiens.erp.modules.catalog.api.dto.CategoryResponse;
import com.sapiens.erp.modules.catalog.domain.Category;
import com.sapiens.erp.modules.catalog.domain.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> listAll() {
        List<CategoryResponse> categories = categoryRepository.findAllByDeletedAtIsNull()
                .stream().map(CategoryResponse::from).toList();
        return ResponseEntity.ok(categories);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<CategoryResponse> create(@RequestParam String name,
                                                    @RequestParam(required = false) String description) {
        if (categoryRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(name)) {
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        }
        Category saved = categoryRepository.save(Category.create(name, description));
        return ResponseEntity
                .created(URI.create("/api/v1/categories/" + saved.getId()))
                .body(CategoryResponse.from(saved));
    }
}
