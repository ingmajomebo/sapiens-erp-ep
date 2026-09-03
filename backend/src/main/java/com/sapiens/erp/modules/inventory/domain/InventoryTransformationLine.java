package com.sapiens.erp.modules.inventory.domain;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.catalog.domain.UnitOfMeasure;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Un renglón del documento, de cualquiera de los dos lados.
 * <p>
 * El código y el nombre del producto se COPIAN aquí a propósito. Si dentro de
 * seis meses "AT-001 · Atún entero" pasa a llamarse "Atún aleta amarilla",
 * este documento debe seguir diciendo lo que decía el día que se hizo. Leerlo
 * de la tabla de productos reescribiría la historia en cada consulta.
 */
@Entity
@Table(name = "inventory_transformation_lines")
@Getter
@Setter
@NoArgsConstructor
public class InventoryTransformationLine {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transformation_id", nullable = false)
    private InventoryTransformation transformation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransformationSide side;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_kind", nullable = false, length = 10)
    private TransformationLineKind lineKind = TransformationLineKind.PRODUCT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Snapshot: no se lee del producto al mostrar el documento. */
    @Column(name = "product_code", length = 50)
    private String productCode;

    /** Snapshot: ver el comentario de la clase. */
    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UnitOfMeasure unit;

    /** Cantidad en unidad base. Null cuando la unidad no es convertible. */
    @Column(name = "base_quantity", precision = 18, scale = 6)
    private BigDecimal baseQuantity;

    @Column(name = "lot_id")
    private UUID lotId;

    /* ── Solo lado CONSUMED ──────────────────────────────────────────────── */

    @Column(name = "unit_cost", precision = 16, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "total_cost", precision = 16, scale = 4)
    private BigDecimal totalCost;

    /* ── Solo lado OBTAINED ──────────────────────────────────────────────── */

    /** Snapshot del precio con que se repartió el costo. Ver clase. */
    @Column(name = "reference_sale_price", precision = 16, scale = 4)
    private BigDecimal referenceSalePrice;

    @Column(name = "sale_value", precision = 18, scale = 4)
    private BigDecimal saleValue;

    @Column(name = "allocation_weight", precision = 12, scale = 9)
    private BigDecimal allocationWeight;

    @Column(name = "allocated_cost", precision = 16, scale = 4)
    private BigDecimal allocatedCost;

    @Column(name = "resulting_unit_cost", precision = 16, scale = 4)
    private BigDecimal resultingUnitCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "costing_status", nullable = false, length = 20)
    private CostingStatus costingStatus = CostingStatus.PENDING;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    /* ── Fábrica ─────────────────────────────────────────────────────────── */

    /**
     * @param baseQuantity cantidad en unidad base, o null si no es convertible.
     *                     No se rellena con un cero: eso haría que el
     *                     rendimiento contara la línea como si no pesara nada.
     */
    public static InventoryTransformationLine of(TransformationSide side,
                                                 TransformationLineKind kind,
                                                 Product product,
                                                 BigDecimal quantity,
                                                 BigDecimal baseQuantity,
                                                 int displayOrder) {
        InventoryTransformationLine l = new InventoryTransformationLine();
        l.id = UUID.randomUUID();
        l.side = side;
        l.lineKind = kind;
        l.product = product;
        l.productCode = product.getSku();
        l.productName = product.getName();
        l.quantity = quantity;
        l.unit = product.getUnitOfMeasure();
        l.baseQuantity = baseQuantity;
        l.displayOrder = displayOrder;
        return l;
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }
}
