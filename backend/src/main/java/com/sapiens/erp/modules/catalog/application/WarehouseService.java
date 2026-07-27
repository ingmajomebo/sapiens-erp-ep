package com.sapiens.erp.modules.catalog.application;

import com.sapiens.erp.modules.catalog.api.dto.WarehouseRequest;
import com.sapiens.erp.modules.catalog.api.dto.WarehouseResponse;
import com.sapiens.erp.modules.catalog.domain.Warehouse;
import com.sapiens.erp.modules.catalog.domain.WarehouseRepository;
import com.sapiens.erp.modules.inventory.domain.InventoryMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final InventoryMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public List<WarehouseResponse> listAll() {
        return warehouseRepository.findAllByDeletedAtIsNullOrderByNameAsc().stream()
                .map(w -> {
                    BigDecimal stock = movementRepository.calculateStockByWarehouseName(w.getName());
                    return WarehouseResponse.from(w, stock.max(BigDecimal.ZERO));
                })
                .toList();
    }

    @Transactional
    public WarehouseResponse create(WarehouseRequest req) {
        if (warehouseRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(req.name().trim())) {
            throw new IllegalArgumentException("Ya existe un almacén con el nombre '" + req.name() + "'");
        }
        Warehouse w = Warehouse.create(req.name().trim(), req.capacity(), req.capacityUnit(), req.description());
        Warehouse saved = warehouseRepository.save(w);
        return WarehouseResponse.from(saved, BigDecimal.ZERO);
    }

    @Transactional
    public WarehouseResponse update(UUID id, WarehouseRequest req) {
        Warehouse w = warehouseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Almacén no encontrado: " + id));
        if (warehouseRepository.existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(req.name().trim(), id)) {
            throw new IllegalArgumentException("Ya existe un almacén con el nombre '" + req.name() + "'");
        }
        w.setName(req.name().trim());
        w.setCapacity(req.capacity());
        if (req.capacityUnit() != null && !req.capacityUnit().isBlank()) w.setCapacityUnit(req.capacityUnit().trim());
        w.setDescription(req.description());
        Warehouse saved = warehouseRepository.save(w);
        BigDecimal stock = movementRepository.calculateStockByWarehouseName(saved.getName());
        return WarehouseResponse.from(saved, stock.max(BigDecimal.ZERO));
    }

    @Transactional
    public void delete(UUID id) {
        Warehouse w = warehouseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Almacén no encontrado: " + id));
        w.softDelete();
        w.setActive(false);
        warehouseRepository.save(w);
    }
}
