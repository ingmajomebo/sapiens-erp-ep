package com.sapiens.erp.modules.inventory.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryTransformationRepository
        extends JpaRepository<InventoryTransformation, UUID> {

    @EntityGraph(attributePaths = { "lines", "lines.product", "warehouse" })
    Optional<InventoryTransformation> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = { "warehouse" })
    List<InventoryTransformation> findAllByDeletedAtIsNullOrderByTransformationDateDescNumberDesc();

    /**
     * Bloqueo de la fila para confirmar o anular.
     * <p>
     * Sin él, dos peticiones simultáneas podrían leer el mismo DRAFT y
     * confirmarlo las dos, duplicando el inventario. El proyecto no usa
     * versionado optimista en ninguna entidad, así que se toma el candado
     * pesimista de JPA en vez de introducir un patrón nuevo.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from InventoryTransformation t where t.id = :id and t.deletedAt is null")
    Optional<InventoryTransformation> findByIdForUpdate(UUID id);

    @Query(value = "SELECT nextval('transformation_number_seq')", nativeQuery = true)
    Long nextNumberValue();
}
