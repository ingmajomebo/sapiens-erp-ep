package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.catalog.domain.Warehouse;
import com.sapiens.erp.modules.catalog.domain.WarehouseRepository;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import com.sapiens.erp.modules.inventory.api.dto.*;
import com.sapiens.erp.modules.inventory.domain.*;
import com.sapiens.erp.modules.inventory.domain.exception.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;
    private final InventoryMovementRepository movementRepository;
    private final MovementLotRepository movementLotRepository;
    private final WarehouseRepository warehouseRepository;
    private final StorageLocationService storageLocationService;
    private final LotLocationCorrectionService lotLocationCorrectionService;
    private final EntityManager entityManager;

    // ── Stock queries ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StockResponse getStock(UUID productId) {
        Product product = requireProduct(productId);
        BigDecimal stock = movementRepository.calculateCurrentStock(productId);
        return StockResponse.of(product, stock, warehouseStocksFor(productId));
    }

    @Transactional(readOnly = true)
    public Page<StockResponse> listStock(Pageable pageable) {
        return productRepository.findAllByDeletedAtIsNull(pageable)
                .map(p -> StockResponse.of(p, movementRepository.calculateCurrentStock(p.getId()),
                        warehouseStocksFor(p.getId())));
    }

    private List<StockResponse.WarehouseStock> warehouseStocksFor(UUID productId) {
        return movementRepository.stockAllLocations(productId).stream()
                .map(row -> new StockResponse.WarehouseStock(
                        UUID.fromString(row[0].toString()),
                        row[1].toString(),
                        new BigDecimal(row[2].toString())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LotResponse> getLots(UUID productId) {
        requireProduct(productId);
        return lotRepository.findByProductIdOrderByReceivedAtDesc(productId)
                .stream()
                .map(lot -> {
                    BigDecimal available = lotRepository.calculateAvailableQuantity(lot.getId());
                    return LotResponse.of(lot, available != null ? available : BigDecimal.ZERO);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LotResponse> getExpiringLots(int days) {
        java.time.LocalDate threshold = java.time.LocalDate.now().plusDays(days);
        return lotRepository.findExpiringLots(threshold).stream()
                .map(lot -> {
                    BigDecimal available = lotRepository.calculateAvailableQuantity(lot.getId());
                    return LotResponse.of(lot, available != null ? available : BigDecimal.ZERO);
                })
                .filter(lr -> lr.availableQuantity().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<MovementResponse> getMovements(UUID productId, Pageable pageable) {
        if (productId != null) {
            requireProduct(productId);
            return movementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
                    .map(MovementResponse::of);
        }
        return movementRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(MovementResponse::of);
    }

    @Transactional(readOnly = true)
    public Page<MovementResponse> getTransfers(Pageable pageable) {
        return movementRepository.findByMovementTypeOrderByCreatedAtDesc(MovementType.TRANSFER, pageable)
                .map(MovementResponse::of);
    }

    // ── ENTRY: receive goods, create lot, recalculate average cost ───────────

    @Transactional
    public MovementResponse registerEntry(EntryRequest req) {
        Product product = requireProduct(req.productId());

        Warehouse warehouse = req.warehouseId() != null
                ? warehouseRepository.findById(req.warehouseId()).orElse(null)
                : null;

        Lot lot = Lot.create(
                product,
                req.quantity(),
                req.purchasePrice(),
                req.receivedAt(),
                req.expiresAt(),
                req.invoiceNumber(),
                req.notes(),
                warehouse
        );
        lotRepository.save(lot);

        BigDecimal stockBefore = movementRepository.calculateCurrentStock(req.productId());
        BigDecimal prevAvg = product.applyEntryAndRecalculateCost(stockBefore, req.quantity(), req.purchasePrice());
        productRepository.save(product);

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.ENTRY,
                req.quantity(), req.purchasePrice(),
                prevAvg, product.getAverageCost(),
                null, warehouse,
                null, req.notes(), req.createdBy()
        );
        movementRepository.save(movement);

        return MovementResponse.of(movement);
    }

    // ── EXIT: consume stock FIFO ───────────────────────────────────────────────

    @Transactional
    public MovementResponse registerExit(ExitRequest req) {
        Product product = requireProduct(req.productId());
        Warehouse fromLocation = resolveFromLocation(req.fromLocationId());

        List<LotConsumption> consumptions = fromLocation != null
                ? consumeFIFOAtLocation(product, req.quantity(), fromLocation)
                : consumeFIFO(product, req.quantity());

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.EXIT,
                req.quantity(), null,
                null, null,
                fromLocation, null,
                req.reason(), req.notes(), req.createdBy()
        );
        movementRepository.save(movement);
        saveMovementLots(movement, consumptions);

        return MovementResponse.of(movement);
    }

    // ── WASTE: merma requires reason, consumes FIFO ───────────────────────────

    @Transactional
    public MovementResponse registerWaste(WasteRequest req) {
        Product product = requireProduct(req.productId());
        Warehouse fromLocation = resolveFromLocation(req.fromLocationId());

        List<LotConsumption> consumptions = fromLocation != null
                ? consumeFIFOAtLocation(product, req.quantity(), fromLocation)
                : consumeFIFO(product, req.quantity());

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.WASTE,
                req.quantity(), null,
                null, null,
                fromLocation, null,
                req.reason(), req.notes(), req.createdBy()
        );
        movementRepository.save(movement);
        saveMovementLots(movement, consumptions);

        return MovementResponse.of(movement);
    }

    // ── ADJUSTMENT ─────────────────────────────────────────────────────────────

    @Transactional
    public MovementResponse registerAdjustment(AdjustmentRequest req) {
        Product product = requireProduct(req.productId());

        Warehouse fromLocation = null;
        Warehouse toLocation = null;

        if (req.type() == MovementType.NEGATIVE_ADJUSTMENT) {
            BigDecimal current = movementRepository.calculateCurrentStock(req.productId());
            if (current.compareTo(req.quantity()) < 0) {
                throw new InsufficientStockException(req.productId(), current, req.quantity());
            }
            fromLocation = resolveFromLocation(req.fromLocationId());
        } else if (req.type() == MovementType.POSITIVE_ADJUSTMENT && req.toLocationId() != null) {
            toLocation = warehouseRepository.findByIdAndDeletedAtIsNull(req.toLocationId())
                    .orElseThrow(() -> new LocationNotFoundException(req.toLocationId()));
        }

        BigDecimal prevAvg = null;
        if (req.type() == MovementType.POSITIVE_ADJUSTMENT && req.unitCost() != null) {
            BigDecimal stockBefore = movementRepository.calculateCurrentStock(req.productId());
            prevAvg = product.applyEntryAndRecalculateCost(stockBefore, req.quantity(), req.unitCost());
            productRepository.save(product);
        }

        InventoryMovement movement = InventoryMovement.create(
                product, req.type(),
                req.quantity(), req.unitCost(),
                prevAvg, prevAvg != null ? product.getAverageCost() : null,
                fromLocation, toLocation,
                req.reason(), req.notes(), req.createdBy()
        );
        movementRepository.save(movement);
        return MovementResponse.of(movement);
    }

    // ── ASSIGN LOT LOCATION (historical correction) ───────────────────────────

    @Transactional
    public LotResponse assignLotLocation(UUID lotId, UUID targetLocationId, String reason) {
        Lot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new IllegalArgumentException("Lote no encontrado: " + lotId));

        if (lot.getWarehouse() != null) {
            throw new IllegalArgumentException(
                    "El lote ya tiene ubicación asignada: " + lot.getWarehouse().getName());
        }

        Warehouse location = warehouseRepository.findByIdAndDeletedAtIsNull(targetLocationId)
                .orElseThrow(() -> new LocationNotFoundException(targetLocationId));

        String invoiceNumber = lot.getInvoiceNumber();
        if (invoiceNumber == null) {
            throw new IllegalArgumentException("El lote no tiene número de factura para vincular el movimiento");
        }

        UUID productId = lot.getProduct().getId();
        lotLocationCorrectionService.correctLotAndMovement(
                lotId, location.getId(), productId, invoiceNumber);

        // JdbcTemplate bypasses Hibernate's first-level cache; refresh to see the updated state
        entityManager.refresh(lot);
        BigDecimal available = lotRepository.calculateAvailableQuantity(lotId);
        return LotResponse.of(lot, available != null ? available : BigDecimal.ZERO);
    }

    // ── TRANSFER ──────────────────────────────────────────────────────────────

    @Transactional
    public MovementResponse registerTransfer(TransferRequest req) {
        if (req.fromLocationId().equals(req.toLocationId())) {
            throw new SameLocationTransferException();
        }

        Product product = requireProduct(req.productId());

        Warehouse fromLocation = warehouseRepository.findByIdAndDeletedAtIsNull(req.fromLocationId())
                .orElseThrow(() -> new LocationNotFoundException(req.fromLocationId()));
        Warehouse toLocation = warehouseRepository.findByIdAndDeletedAtIsNull(req.toLocationId())
                .orElseThrow(() -> new LocationNotFoundException(req.toLocationId()));

        List<LotConsumption> consumptions;
        if (req.lotId() != null) {
            // Specific lot requested
            Lot lot = lotRepository.findById(req.lotId())
                    .orElseThrow(() -> new IllegalArgumentException("Lot not found: " + req.lotId()));
            BigDecimal available = lotRepository.calculateAvailableAtLocation(req.lotId(), req.fromLocationId());
            if (available == null || available.compareTo(req.quantity()) < 0) {
                BigDecimal avail = available != null ? available : BigDecimal.ZERO;
                throw new InsufficientStockAtLocationException(
                        product.getId(), fromLocation.getName(), avail, req.quantity());
            }
            consumptions = List.of(new LotConsumption(lot, req.quantity()));
        } else {
            consumptions = consumeFIFOAtLocation(product, req.quantity(), fromLocation);
        }

        InventoryMovement movement = InventoryMovement.createTransfer(
                product, req.quantity(), fromLocation, toLocation,
                req.reason(), req.notes(), req.createdBy()
        );
        movementRepository.save(movement);
        saveMovementLots(movement, consumptions);

        return MovementResponse.of(movement);
    }

    // ── Consumo para transformaciones ──────────────────────────────────────────

    /**
     * Consume lotes FIFO SIN bloquear cuando el stock registrado no alcanza.
     *
     * <p>Existe aparte de {@link #registerExit} a propósito. El invariante
     * "stock no negativo" sigue vigente para ventas y mermas: ahí un faltante
     * es un error que hay que resolver antes de facturar. En producción no:
     * si se procesaron 10 kg y el sistema solo tenía 8 registrados, el pescado
     * ya está cortado. Detener la captura no devuelve el pescado; solo impide
     * registrar lo que ocurrió.
     *
     * <p>La existencia negativa resultante es la señal de que hay que hacer un
     * conteo, y por eso se informa como advertencia en vez de esconderse.
     *
     * @return los lotes efectivamente consumidos, que pueden sumar MENOS que
     *         la cantidad pedida cuando no había suficiente.
     */
    @Transactional
    public List<LotConsumption> consumeForTransformation(Product product, BigDecimal required,
                                                          Warehouse location) {
        List<Lot> lots = location != null
                ? lotRepository.findAvailableByProductFIFO(product.getId())
                : lotRepository.findAvailableByProductFIFO(product.getId());

        List<LotConsumption> consumptions = new ArrayList<>();
        BigDecimal remaining = required;

        for (Lot lot : lots) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal available = lotRepository.calculateAvailableQuantity(lot.getId());
            if (available == null || available.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal toConsume = available.min(remaining);
            consumptions.add(new LotConsumption(lot, toConsume));
            remaining = remaining.subtract(toConsume);
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            log.warn("Transformación consume {} de {} pero solo había {} en lotes: la existencia quedará negativa",
                    required, product.getName(), required.subtract(remaining));
        }
        return consumptions;
    }

    /** Persiste el vínculo movimiento-lote. Expuesto para las transformaciones. */
    @Transactional
    public void linkMovementLots(InventoryMovement movement, List<LotConsumption> consumptions) {
        saveMovementLots(movement, consumptions);
    }

    // ── FIFO helpers ───────────────────────────────────────────────────────────

    /** Global FIFO across all locations (backward-compatible). */
    private List<LotConsumption> consumeFIFO(Product product, BigDecimal required) {
        BigDecimal currentStock = movementRepository.calculateCurrentStock(product.getId());
        if (currentStock.compareTo(required) < 0) {
            throw new InsufficientStockException(product.getId(), currentStock, required);
        }

        List<Lot> lots = lotRepository.findAvailableByProductFIFO(product.getId());
        List<LotConsumption> consumptions = new ArrayList<>();
        BigDecimal remaining = required;

        for (Lot lot : lots) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal available = lotRepository.calculateAvailableQuantity(lot.getId());
            if (available == null || available.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal toConsume = available.min(remaining);
            consumptions.add(new LotConsumption(lot, toConsume));
            remaining = remaining.subtract(toConsume);
        }

        return consumptions;
    }

    /** Location-aware FIFO — only consumes lots available at the given location. */
    private List<LotConsumption> consumeFIFOAtLocation(Product product, BigDecimal required,
                                                        Warehouse location) {
        BigDecimal stockAtLocation = movementRepository.calculateStockAtLocation(
                product.getId(), location.getId());
        if (stockAtLocation.compareTo(required) < 0) {
            throw new InsufficientStockAtLocationException(
                    product.getId(), location.getName(), stockAtLocation, required);
        }

        List<Object[]> rows = lotRepository.findAvailableByProductAndLocationFIFO(
                product.getId(), location.getId());
        List<LotConsumption> consumptions = new ArrayList<>();
        BigDecimal remaining = required;

        for (Object[] row : rows) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            UUID lotId = row[0] instanceof UUID ? (UUID) row[0] : UUID.fromString(row[0].toString());
            BigDecimal available = new BigDecimal(row[3].toString());
            if (available.compareTo(BigDecimal.ZERO) <= 0) continue;
            Lot lot = lotRepository.findById(lotId)
                    .orElseThrow(() -> new IllegalStateException("Lot not found: " + lotId));
            BigDecimal toConsume = available.min(remaining);
            consumptions.add(new LotConsumption(lot, toConsume));
            remaining = remaining.subtract(toConsume);
        }

        return consumptions;
    }

    /** Resolve fromLocationId: explicit > default > null (falls back to global FIFO). */
    private Warehouse resolveFromLocation(UUID fromLocationId) {
        if (fromLocationId != null) {
            return warehouseRepository.findByIdAndDeletedAtIsNull(fromLocationId)
                    .orElseThrow(() -> new LocationNotFoundException(fromLocationId));
        }
        return storageLocationService.findDefault().orElse(null);
    }

    private void saveMovementLots(InventoryMovement movement, List<LotConsumption> consumptions) {
        consumptions.forEach(c ->
                movementLotRepository.save(MovementLot.create(movement, c.lot(), c.quantity()))
        );
    }

    private Product requireProduct(UUID productId) {
        return productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    public record LotConsumption(Lot lot, BigDecimal quantity) {}
}
