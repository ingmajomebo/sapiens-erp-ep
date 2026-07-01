package com.sapiens.erp.modules.catalog.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product extends AuditableEntity {

    @Id
    private UUID id;

    @Column(length = 100, nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure", length = 10, nullable = false)
    private UnitOfMeasure unitOfMeasure;

    @Column(name = "minimum_stock", nullable = false, precision = 10, scale = 3)
    private BigDecimal minimumStock = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 50)
    private String sku;

    @Column(length = 100)
    private String barcode;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", length = 30)
    private ProductType productType;

    @Column(name = "purchase_cost", precision = 14, scale = 4)
    private BigDecimal purchaseCost;

    @Column(name = "purchase_cost_last", precision = 14, scale = 4)
    private BigDecimal purchaseCostLast;

    @Column(name = "average_cost", precision = 14, scale = 4)
    private BigDecimal averageCost;

    @Column(name = "sale_price", precision = 14, scale = 4)
    private BigDecimal salePrice;

    @Column(name = "inventory_tracking_enabled", nullable = false)
    private boolean inventoryTrackingEnabled = true;

    @Column(name = "default_warehouse", length = 100)
    private String defaultWarehouse;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    public static Product create(String name, Category category, UnitOfMeasure unitOfMeasure,
                                  BigDecimal minimumStock, String description) {
        Product p = new Product();
        p.id = UUID.randomUUID();
        p.name = name;
        p.category = category;
        p.unitOfMeasure = unitOfMeasure != null ? unitOfMeasure : UnitOfMeasure.KG;
        p.minimumStock = minimumStock != null ? minimumStock : BigDecimal.ZERO;
        p.description = description;
        p.status = ProductStatus.ACTIVE;
        p.active = true;
        p.inventoryTrackingEnabled = true;
        return p;
    }

    /**
     * Recalculates weighted average cost on each positive inventory movement.
     * Formula: (currentStock × currentAvgCost + entryQty × entryCost) / (currentStock + entryQty)
     *
     * @param currentStock stock before this entry (may be zero for first purchase)
     * @param entryQty     quantity being added
     * @param entryCost    unit cost of this entry
     * @return the previous average cost (for audit)
     */
    public BigDecimal applyEntryAndRecalculateCost(BigDecimal currentStock, BigDecimal entryQty, BigDecimal entryCost) {
        BigDecimal previousAvg = this.averageCost;

        BigDecimal stock = currentStock != null ? currentStock : BigDecimal.ZERO;
        BigDecimal currentAvg = this.averageCost != null ? this.averageCost : BigDecimal.ZERO;

        BigDecimal totalValue = stock.multiply(currentAvg).add(entryQty.multiply(entryCost));
        BigDecimal newStock = stock.add(entryQty);
        this.averageCost = totalValue.divide(newStock, 4, RoundingMode.HALF_UP);
        this.purchaseCostLast = entryCost;

        return previousAvg;
    }

    public void deactivate() {
        this.active = false;
        this.status = ProductStatus.INACTIVE;
        this.softDelete();
    }

    public boolean isActive() {
        return this.active;
    }
}
