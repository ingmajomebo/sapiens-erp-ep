package com.sapiens.erp.modules.inventory.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.ProductRepository;
import com.sapiens.erp.modules.catalog.domain.exception.ProductNotFoundException;
import com.sapiens.erp.modules.inventory.api.dto.*;
import com.sapiens.erp.modules.inventory.domain.*;
import com.sapiens.erp.modules.inventory.domain.exception.InsufficientStockException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;
    private final InventoryMovementRepository movementRepository;
    private final MovementLotRepository movementLotRepository;

    // ── Stock queries ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StockResponse getStock(UUID productId) {
        Product product = requireProduct(productId);
        BigDecimal stock = movementRepository.calculateCurrentStock(productId);
        return StockResponse.of(product, stock);
    }

    @Transactional(readOnly = true)
    public Page<StockResponse> listStock(Pageable pageable) {
        return productRepository.findAllByDeletedAtIsNull(pageable)
                .map(p -> StockResponse.of(p, movementRepository.calculateCurrentStock(p.getId())));
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

    // ── ENTRY: receive goods, create lot, recalculate average cost ───────────

    @Transactional
    public MovementResponse registerEntry(EntryRequest req) {
        Product product = requireProduct(req.productId());

        Lot lot = Lot.create(
                product,
                req.quantity(),
                req.purchasePrice(),
                req.receivedAt(),
                req.expiresAt(),
                req.invoiceNumber(),
                req.notes()
        );
        lotRepository.save(lot);

        BigDecimal stockBefore = movementRepository.calculateCurrentStock(req.productId());
        BigDecimal prevAvg = product.applyEntryAndRecalculateCost(stockBefore, req.quantity(), req.purchasePrice());
        productRepository.save(product);

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.ENTRY,
                req.quantity(), req.purchasePrice(),
                prevAvg, product.getAverageCost(),
                null, req.notes(), req.createdBy()
        );
        movementRepository.save(movement);

        return MovementResponse.of(movement);
    }

    // ── EXIT: consume stock FIFO ───────────────────────────────────────────────

    @Transactional
    public MovementResponse registerExit(ExitRequest req) {
        Product product = requireProduct(req.productId());

        List<LotConsumption> consumptions = consumeFIFO(product, req.quantity());

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.EXIT,
                req.quantity(), null,
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

        List<LotConsumption> consumptions = consumeFIFO(product, req.quantity());

        InventoryMovement movement = InventoryMovement.create(
                product, MovementType.WASTE,
                req.quantity(), null,
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

        if (req.type() == MovementType.NEGATIVE_ADJUSTMENT) {
            BigDecimal current = movementRepository.calculateCurrentStock(req.productId());
            if (current.compareTo(req.quantity()) < 0) {
                throw new InsufficientStockException(req.productId(), current, req.quantity());
            }
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
                req.reason(), req.notes(), req.createdBy()
        );
        movementRepository.save(movement);
        return MovementResponse.of(movement);
    }

    // ── FIFO helpers ───────────────────────────────────────────────────────────

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

    private void saveMovementLots(InventoryMovement movement, List<LotConsumption> consumptions) {
        consumptions.forEach(c ->
                movementLotRepository.save(MovementLot.create(movement, c.lot(), c.quantity()))
        );
    }

    private Product requireProduct(UUID productId) {
        return productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    record LotConsumption(Lot lot, BigDecimal quantity) {}
}
