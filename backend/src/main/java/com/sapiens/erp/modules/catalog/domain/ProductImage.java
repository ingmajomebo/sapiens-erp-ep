package com.sapiens.erp.modules.catalog.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Una fotografía de un producto.
 *
 * <p>Los bytes NO viven aquí: la base guarda el identificador del archivo y sus
 * metadatos, y el archivo va al almacenamiento. Esa separación es lo que
 * permite cambiar de disco local a S3 sin tocar ni una fila.
 *
 * <p>Lleva sus propias marcas de tiempo en vez de heredar de
 * {@code AuditableEntity} porque su borrado lógico no arrastra los mismos
 * eventos de auditoría: una foto se retira sin que eso sea un cambio del
 * producto. Los tipos sí son los mismos —TIMESTAMPTZ— desde la V52.
 */
@Entity
@Table(name = "product_images")
@Getter
@Setter
@NoArgsConstructor
public class ProductImage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductImageRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductImageStatus status = ProductImageStatus.PROCESSING;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    /**
     * Nombre del archivo en el almacenamiento. Es lo único con lo que se
     * construye la ruta física; el nombre original nunca se usa para eso,
     * porque un nombre subido por el usuario puede contener "../".
     */
    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "original_width")
    private Integer originalWidth;

    @Column(name = "original_height")
    private Integer originalHeight;

    @Column(name = "original_bytes")
    private Integer originalBytes;

    @Column(name = "alt_text", length = 255)
    private String altText;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static ProductImage create(Product product, ProductImageRole role, String storageKey,
                                       String originalFilename, String altText, int displayOrder) {
        ProductImage img = new ProductImage();
        img.id = UUID.randomUUID();
        img.product = product;
        img.role = role;
        img.storageKey = storageKey;
        img.originalFilename = originalFilename;
        img.altText = altText;
        img.displayOrder = displayOrder;
        img.status = ProductImageStatus.PROCESSING;
        return img;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void markReady(Integer width, Integer height, Integer bytes) {
        this.status = ProductImageStatus.READY;
        this.failureReason = null;
        this.originalWidth = width;
        this.originalHeight = height;
        this.originalBytes = bytes;
    }

    public void markFailed(String reason) {
        this.status = ProductImageStatus.FAILED;
        this.failureReason = reason;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public boolean isVisible() {
        return deletedAt == null && status == ProductImageStatus.READY;
    }
}
