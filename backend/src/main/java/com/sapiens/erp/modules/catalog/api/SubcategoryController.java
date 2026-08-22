package com.sapiens.erp.modules.catalog.api;

import com.sapiens.erp.modules.catalog.api.dto.SubcategoryResponse;
import com.sapiens.erp.modules.catalog.application.SubcategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/subcategories")
@RequiredArgsConstructor
public class SubcategoryController {

    private final SubcategoryService subcategoryService;

    @GetMapping
    public ResponseEntity<List<SubcategoryResponse>> list(
            @RequestParam(required = false) UUID categoryId) {
        return ResponseEntity.ok(subcategoryService.list(categoryId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CATALOG_CATEGORY_MANAGE')")
    public ResponseEntity<SubcategoryResponse> create(@RequestParam UUID categoryId,
                                                      @RequestParam String name,
                                                      @RequestParam(required = false) String description) {
        SubcategoryResponse created = subcategoryService.create(categoryId, name, description);
        return ResponseEntity
                .created(URI.create("/api/v1/subcategories/" + created.id()))
                .body(created);
    }
}
