package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.application.StorefrontOrderService;
import com.sapiens.erp.modules.storefront.infrastructure.StorefrontAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Pedidos de la tienda. Se puede comprar con cuenta o como invitado;
 * en ambos casos hay que dejar los datos de entrega.
 */
@RestController
@RequestMapping("/api/v1/public/orders")
@RequiredArgsConstructor
public class StorefrontOrderController {

    private final StorefrontOrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResultResponse> create(@Valid @RequestBody CreateOrderRequest req,
                                                      HttpServletRequest request) {
        UUID accountId = (UUID) request.getAttribute(
                StorefrontAuthenticationFilter.ACCOUNT_ID_ATTRIBUTE);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(req, accountId));
    }

    @GetMapping("/track/{trackingToken}")
    public ResponseEntity<OrderStatusResponse> track(@PathVariable String trackingToken) {
        return ResponseEntity.ok(orderService.track(trackingToken));
    }
}
