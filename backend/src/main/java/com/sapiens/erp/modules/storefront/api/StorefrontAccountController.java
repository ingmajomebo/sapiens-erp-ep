package com.sapiens.erp.modules.storefront.api;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.application.StorefrontAccountService;
import com.sapiens.erp.modules.storefront.application.StorefrontOrderService;
import com.sapiens.erp.modules.storefront.domain.exception.StorefrontAuthException;
import com.sapiens.erp.modules.storefront.infrastructure.StorefrontAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Cuentas de cliente. El registro es opcional: también se compra como invitado. */
@RestController
@RequestMapping("/api/v1/public/accounts")
@RequiredArgsConstructor
public class StorefrontAccountController {

    private final StorefrontAccountService accountService;
    private final StorefrontOrderService orderService;

    @PostMapping("/register")
    public ResponseEntity<SessionResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(accountService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<SessionResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(accountService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> me(HttpServletRequest request) {
        return ResponseEntity.ok(accountService.getById(requireAccount(request)));
    }

    @GetMapping("/me/orders")
    public ResponseEntity<List<OrderStatusResponse>> myOrders(HttpServletRequest request) {
        return ResponseEntity.ok(orderService.listForAccount(requireAccount(request)));
    }

    private UUID requireAccount(HttpServletRequest request) {
        Object accountId = request.getAttribute(StorefrontAuthenticationFilter.ACCOUNT_ID_ATTRIBUTE);
        if (accountId == null) throw new StorefrontAuthException();
        return (UUID) accountId;
    }
}
