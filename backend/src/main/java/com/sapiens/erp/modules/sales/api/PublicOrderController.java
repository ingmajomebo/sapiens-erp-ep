package com.sapiens.erp.modules.sales.api;

import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.OrderResponse;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.PublicCatalogResponse;
import com.sapiens.erp.modules.sales.api.dto.SalesOrderDtos.PublicCreateRequest;
import com.sapiens.erp.modules.sales.application.SalesOrderLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Canal público de pedidos (REQ-VEN-001): sin autenticación, validado por el token
 * del enlace que la empresa genera y administra. Abierto en SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/public/orders")
@RequiredArgsConstructor
public class PublicOrderController {

    private final SalesOrderLinkService linkService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicCatalogResponse> catalog(@PathVariable String token) {
        return ResponseEntity.ok(linkService.publicCatalog(token));
    }

    @PostMapping("/{token}")
    public ResponseEntity<OrderResponse> create(@PathVariable String token,
                                                @Valid @RequestBody PublicCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(linkService.createPublicOrder(token, request));
    }
}
