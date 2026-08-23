package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.StockRequestCreate;
import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.StockRequestResponse;
import com.sapiens.erp.modules.storefront.application.StorefrontStockRequestService;
import com.sapiens.erp.modules.storefront.infrastructure.StorefrontAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Avisos de disponibilidad. Abierto: pedir que te avisen no debería exigir
 * una cuenta. Si el cliente sí tiene sesión, la solicitud queda asociada.
 */
@RestController
@RequestMapping("/api/v1/public/stock-requests")
@RequiredArgsConstructor
public class StorefrontStockRequestController {

    private final StorefrontStockRequestService stockRequestService;

    @PostMapping
    public ResponseEntity<StockRequestResponse> register(
            @Valid @RequestBody StockRequestCreate body,
            HttpServletRequest request
    ) {
        UUID accountId = (UUID) request.getAttribute(
                StorefrontAuthenticationFilter.ACCOUNT_ID_ATTRIBUTE);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stockRequestService.register(body, accountId));
    }
}
