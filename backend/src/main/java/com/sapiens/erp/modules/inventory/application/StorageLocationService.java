package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.catalog.domain.Warehouse;
import com.sapiens.erp.modules.catalog.domain.WarehouseRepository;
import com.sapiens.erp.modules.inventory.api.dto.StorageLocationRequest;
import com.sapiens.erp.modules.inventory.api.dto.StorageLocationResponse;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import com.sapiens.erp.modules.inventory.domain.exception.LocationHasStockException;
import com.sapiens.erp.modules.inventory.domain.exception.LocationNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StorageLocationService {

    private final WarehouseRepository warehouseRepository;
    private final InventoryMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public List<StorageLocationResponse> listAll() {
        return warehouseRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
                .map(StorageLocationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StorageLocationResponse getDefaultLocation() {
        return warehouseRepository.findFirstByIsDefaultTrueAndDeletedAtIsNull()
                .map(StorageLocationResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("No default storage location configured"));
    }

    @Transactional
    public StorageLocationResponse create(StorageLocationRequest req) {
        if (warehouseRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(req.name().trim())) {
            throw new IllegalArgumentException("Ya existe una ubicación con el nombre '" + req.name() + "'");
        }
        if (req.isDefault()) {
            clearExistingDefaults();
        }
        Warehouse w = Warehouse.create(req.name().trim(), req.capacity(),
                req.capacityUnit(), req.description());
        if (req.isDefault()) {
            w.setDefault(true);
        }
        return StorageLocationResponse.from(warehouseRepository.save(w));
    }

    @Transactional
    public StorageLocationResponse update(UUID id, StorageLocationRequest req) {
        Warehouse w = requireLocation(id);
        if (warehouseRepository.existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(req.name().trim(), id)) {
            throw new IllegalArgumentException("Ya existe una ubicación con el nombre '" + req.name() + "'");
        }
        if (req.isDefault() && !w.isDefault()) {
            clearExistingDefaults();
        }
        w.setName(req.name().trim());
        w.setDescription(req.description());
        w.setCapacity(req.capacity());
        if (req.capacityUnit() != null && !req.capacityUnit().isBlank()) {
            w.setCapacityUnit(req.capacityUnit().trim());
        }
        w.setDefault(req.isDefault());
        return StorageLocationResponse.from(warehouseRepository.save(w));
    }

    @Transactional
    public void delete(UUID id) {
        Warehouse w = requireLocation(id);
        if (w.isDefault()) {
            throw new LocationHasStockException("No se puede eliminar la ubicación por defecto. Asigne primero otra ubicación como predeterminada.");
        }
        BigDecimal totalStock = movementRepository.calculateTotalStockAtLocation(id);
        if (totalStock != null && totalStock.compareTo(BigDecimal.ZERO) > 0) {
            throw new LocationHasStockException(w.getName(), totalStock);
        }
        w.softDelete();
        w.setActive(false);
        warehouseRepository.save(w);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    Optional<Warehouse> findDefault() {
        return warehouseRepository.findFirstByIsDefaultTrueAndDeletedAtIsNull();
    }

    private Warehouse requireLocation(UUID id) {
        return warehouseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LocationNotFoundException(id));
    }

    private void clearExistingDefaults() {
        warehouseRepository.findAllByIsDefaultTrueAndDeletedAtIsNull()
                .forEach(existing -> {
                    existing.setDefault(false);
                    warehouseRepository.save(existing);
                });
    }
}
