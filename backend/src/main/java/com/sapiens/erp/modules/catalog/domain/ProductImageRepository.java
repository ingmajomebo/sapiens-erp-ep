package com.sapiens.erp.modules.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    /**
     * Las fotos visibles de un producto, en el orden en que deben mostrarse.
     *
     * <p>Ordena por rol antes que por posición para que la principal encabece
     * la galería aunque a alguien se le olvide ponerle orden 0.
     */
    @Query("""
            SELECT i FROM ProductImage i
            WHERE i.product.id = :productId
              AND i.deletedAt IS NULL
              AND i.status = com.sapiens.erp.modules.catalog.domain.ProductImageStatus.READY
            ORDER BY CASE i.role WHEN com.sapiens.erp.modules.catalog.domain.ProductImageRole.PRIMARY THEN 0
                                 WHEN com.sapiens.erp.modules.catalog.domain.ProductImageRole.HOVER THEN 1
                                 ELSE 2 END,
                     i.displayOrder, i.createdAt
            """)
    List<ProductImage> findVisibleByProduct(@Param("productId") UUID productId);

    /** Igual que la anterior pero para varios productos: evita una consulta por tarjeta. */
    @Query("""
            SELECT i FROM ProductImage i
            WHERE i.product.id IN :productIds
              AND i.deletedAt IS NULL
              AND i.status = com.sapiens.erp.modules.catalog.domain.ProductImageStatus.READY
            ORDER BY CASE i.role WHEN com.sapiens.erp.modules.catalog.domain.ProductImageRole.PRIMARY THEN 0
                                 WHEN com.sapiens.erp.modules.catalog.domain.ProductImageRole.HOVER THEN 1
                                 ELSE 2 END,
                     i.displayOrder, i.createdAt
            """)
    List<ProductImage> findVisibleByProducts(@Param("productIds") Collection<UUID> productIds);

    Optional<ProductImage> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
            SELECT i FROM ProductImage i
            WHERE i.product.id = :productId AND i.role = :role AND i.deletedAt IS NULL
            """)
    Optional<ProductImage> findByProductAndRole(@Param("productId") UUID productId,
                                                 @Param("role") ProductImageRole role);
}
