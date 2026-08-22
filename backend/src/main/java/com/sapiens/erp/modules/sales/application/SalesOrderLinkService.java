package com.sapiens.erp.modules.sales.application;

import com.sapiens.erp.modules.catalog.domain.Product;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.*;
import com.sapiens.erp.modules.sales.domain.SalesOrderLink;
import com.sapiens.erp.modules.sales.domain.SalesOrderLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Enlaces públicos de pedido: administración (empresa) y consumo (cliente anónimo). */
@Service
@RequiredArgsConstructor
public class SalesOrderLinkService {

    private final SalesOrderLinkRepository linkRepository;
    private final SalesOrderService salesOrderService;
    private final com.sapiens.erp.modules.catalog.domain.ProductRepository productRepository;
    private final StorefrontSettingsService storefrontSettingsService;

    // ── Administración ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LinkResponse> listAll() {
        return linkRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                .map(LinkResponse::from)
                .toList();
    }

    @Transactional
    public LinkResponse create(LinkRequest req) {
        return LinkResponse.from(linkRepository.save(SalesOrderLink.create(req.label())));
    }

    @Transactional
    public LinkResponse toggle(UUID id) {
        SalesOrderLink link = linkRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Enlace no encontrado: " + id));
        link.setEnabled(!link.isEnabled());
        return LinkResponse.from(linkRepository.save(link));
    }

    // ── Canal público ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PublicCatalogResponse publicCatalog(String token) {
        SalesOrderLink link = requireActiveLink(token);
        List<PublicProductResponse> products = productRepository
                .findAllByDeletedAtIsNull(Pageable.unpaged()).getContent().stream()
                .filter(Product::isActive)
                .filter(p -> p.getSalePrice() != null)
                .map(p -> new PublicProductResponse(p.getId(), p.getName(),
                        p.getUnitOfMeasure().name(), p.getSalePrice(), p.getImageUrl()))
                .toList();
        return new PublicCatalogResponse(link.getLabel(), products, storefrontSettingsService.getAll());
    }

    @Transactional
    public OrderResponse createPublicOrder(String token, PublicCreateRequest req) {
        SalesOrderLink link = requireActiveLink(token);
        return salesOrderService.createPublic(link, req);
    }

    private SalesOrderLink requireActiveLink(String token) {
        return linkRepository.findByTokenAndDeletedAtIsNull(token)
                .filter(SalesOrderLink::isEnabled)
                .orElseThrow(() -> new IllegalArgumentException("El enlace de pedido no es válido o está desactivado"));
    }
}
