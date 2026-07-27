package com.sapiens.erp.modules.finance.api;

import com.sapiens.erp.modules.finance.api.dto.*;
import com.sapiens.erp.modules.finance.application.CashSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cash-sessions")
@RequiredArgsConstructor
public class CashSessionController {

    private final CashSessionService cashSessionService;

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('CASH_SESSION_VIEW')")
    public ResponseEntity<CashKpisResponse> getCurrent() {
        return cashSessionService.getKpis()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CASH_SESSION_OPEN')")
    public CashSessionResponse open(@RequestBody OpenRegisterRequest req) {
        return cashSessionService.open(req);
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('CASH_SESSION_CLOSE')")
    public CashSessionResponse close(
            @PathVariable UUID id,
            @Valid @RequestBody CloseRegisterRequest req) {
        return cashSessionService.close(id, req);
    }

    @PostMapping("/{id}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CASH_MOVEMENT_CREATE')")
    public CashMovementResponse createMovement(
            @PathVariable UUID id,
            @Valid @RequestBody CashMovementRequest req) {
        return cashSessionService.createManualMovement(id, req);
    }

    @GetMapping("/{id}/movements")
    @PreAuthorize("hasAuthority('CASH_SESSION_VIEW')")
    public Page<CashMovementResponse> getMovements(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 200));
        return cashSessionService.getMovements(id, pageable);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CASH_SESSION_HISTORY')")
    public Page<CashSessionResponse> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return cashSessionService.getHistory(pageable);
    }
}
