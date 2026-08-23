package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.StockRequestCreate;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.StockRequestResponse;
import com.sapiens.erp.modules.storefront.domain.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Registra el interés por una presentación sin existencias.
 * <p>
 * No reserva stock ni crea un pedido: hacerlo rompería el invariante de que
 * el stock nunca es negativo, y prometería una entrega que el almacén no puede
 * respaldar. Lo que queda es una intención de compra que alguien atiende.
 * <p>
 * Deliberadamente sin dependencia del módulo de inventario: cuando exista el
 * aviso automático, será ese proceso el que lea esta tabla — nunca al revés.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorefrontStockRequestService {

    private final StockRequestRepository stockRequestRepository;
    private final StorefrontProductRepository storefrontProductRepository;

    @Transactional
    public StockRequestResponse register(StockRequestCreate request, UUID accountId) {
        // Honeypot: al bot se le responde como a un humano para no darle señal
        if (request.website() != null && !request.website().isBlank()) {
            log.debug("Solicitud de aviso descartada por honeypot");
            return new StockRequestResponse(UUID.randomUUID(), StockRequestStatus.WAITING_STOCK.name(), false);
        }

        StorefrontProduct presentacion = storefrontProductRepository
                .findById(request.presentationId())
                .filter(sp -> sp.isActive() && sp.isPublished())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Presentación no encontrada: " + request.presentationId()));

        String telefono = request.phone().trim();

        // Ya hay una solicitud abierta de este teléfono: no se duplica, se
        // actualiza. Pedirlo dos veces no debería crear dos avisos.
        var existente = stockRequestRepository
                .findByProductIdAndPhoneAndStatusAndDeletedAtIsNull(
                        presentacion.getProductId(), telefono, StockRequestStatus.WAITING_STOCK);

        if (existente.isPresent()) {
            StockRequest r = existente.get();
            r.setCustomerName(request.customerName());
            r.setEmail(request.email());
            r.setDesiredQuantity(request.desiredQuantity());
            if (accountId != null) r.setAccountId(accountId);
            return new StockRequestResponse(r.getId(), r.getStatus().name(), true);
        }

        StockRequest nueva = new StockRequest();
        nueva.setId(UUID.randomUUID());
        nueva.setProductId(presentacion.getProductId());
        nueva.setAccountId(accountId);
        nueva.setCustomerName(request.customerName());
        nueva.setPhone(telefono);
        nueva.setEmail(request.email());
        nueva.setDesiredQuantity(request.desiredQuantity());
        nueva.setStatus(StockRequestStatus.WAITING_STOCK);

        stockRequestRepository.save(nueva);
        log.info("Solicitud de aviso registrada para la presentación {}", presentacion.getProductId());

        return new StockRequestResponse(nueva.getId(), nueva.getStatus().name(), false);
    }
}
