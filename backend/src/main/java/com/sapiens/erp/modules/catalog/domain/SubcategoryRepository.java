package com.sapiens.erp.modules.catalog.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubcategoryRepository extends JpaRepository<Subcategory, UUID> {

    // La respuesta incluye el nombre de la categoría y el controlador no abre
    // transacción (open-in-view está deshabilitado), así que hay que traerla
    // en la misma consulta o el proxy no se puede resolver.
    @EntityGraph(attributePaths = "category")
    List<Subcategory> findAllByDeletedAtIsNullOrderByNameAsc();

    @EntityGraph(attributePaths = "category")
    List<Subcategory> findAllByCategoryIdAndDeletedAtIsNullOrderByNameAsc(UUID categoryId);

    boolean existsByCategoryIdAndNameIgnoreCaseAndDeletedAtIsNull(UUID categoryId, String name);
}
