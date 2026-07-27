package com.sapiens.erp.modules.finance.application;

import com.sapiens.erp.modules.finance.api.dto.*;
import com.sapiens.erp.modules.finance.domain.*;
import com.sapiens.erp.modules.finance.domain.exception.InsufficientCashException;
import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Year;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashSessionService {

    private static final Logger log = LoggerFactory.getLogger(CashSessionService.class);

    private final CashSessionRepository cashSessionRepository;
    private final CashSessionMovementRepository movementRepository;
    private final FinancialAccountRepository financialAccountRepository;
    private final FinancialMovementRepository financialMovementRepository;
    private final UserRepository userRepository;

    // ── Current session KPIs ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<CashKpisResponse> getKpis() {
        return cashSessionRepository
                .findFirstByStatusAndDeletedAtIsNull(CashSessionStatus.OPEN)
                .map(this::buildKpis);
    }

    private CashKpisResponse buildKpis(CashSession session) {
        UUID sid = session.getId();
        BigDecimal cashIn  = movementRepository.sumCashIn(sid);
        BigDecimal cashOut = movementRepository.sumCashOut(sid);
        BigDecimal expected = session.getOpeningBalance().add(cashIn).subtract(cashOut);

        return new CashKpisResponse(
                sid,
                session.getSessionNumber(),
                session.getStatus().name(),
                session.getOpenedAt(),
                session.getOpenedBy() != null ? session.getOpenedBy().getName() : null,
                session.getOpeningBalance(),
                expected,
                movementRepository.sumTotalSales(sid),
                movementRepository.sumApPayments(sid),
                movementRepository.sumExpenses(sid),
                movementRepository.sumManualIn(sid),
                movementRepository.sumManualOut(sid),
                movementRepository.countBySessionId(sid),
                cashIn,
                movementRepository.sumCardIn(sid),
                movementRepository.sumTransferIn(sid)
        );
    }

    // ── Open ──────────────────────────────────────────────────────────────────

    @Transactional
    @SuppressWarnings("null")
    public CashSessionResponse open(OpenRegisterRequest req) {
        if (cashSessionRepository.existsByStatusAndDeletedAtIsNull(CashSessionStatus.OPEN)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una sesión de caja abierta");
        }

        User user = resolveCurrentUser();
        BigDecimal opening = req.openingBalance() != null ? req.openingBalance() : BigDecimal.ZERO;
        CashSession session = CashSession.open(user, opening, req.notes(), generateSessionNumber());
        cashSessionRepository.save(session);

        // OPENING movement — so the initial amount appears in the audit log
        CashSessionMovement openingMovement = CashSessionMovement.create(
                session, CashMovementType.OPENING, CashMovementDirection.IN,
                CashPaymentMethod.CASH, opening,
                session.getSessionNumber(), "Apertura de caja", user.getId());
        movementRepository.save(openingMovement);

        log.info("Sesión de caja {} abierta con saldo inicial {}", session.getSessionNumber(), opening);
        return CashSessionResponse.from(session);
    }

    // ── Close ─────────────────────────────────────────────────────────────────

    @Transactional
    @SuppressWarnings("null")
    public CashSessionResponse close(UUID sessionId, CloseRegisterRequest req) {
        CashSession session = cashSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));

        if (session.getStatus() != CashSessionStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "La sesión ya fue cerrada");
        }

        UUID sid = session.getId();
        BigDecimal cashIn  = movementRepository.sumCashIn(sid);
        BigDecimal cashOut = movementRepository.sumCashOut(sid);
        BigDecimal expected = session.getOpeningBalance().add(cashIn).subtract(cashOut);
        BigDecimal variance = req.countedBalance().subtract(expected);

        if (variance.compareTo(BigDecimal.ZERO) != 0 && (req.notes() == null || req.notes().isBlank())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Las notas son obligatorias cuando hay diferencia de arqueo (diferencia: " +
                    variance.stripTrailingZeros().toPlainString() + ")");
        }

        User user = resolveCurrentUser();
        session.close(user, expected, req.countedBalance(), req.notes());
        cashSessionRepository.save(session);

        // Register variance in Finance if non-zero and a CASH account exists
        if (variance.compareTo(BigDecimal.ZERO) != 0) {
            financialAccountRepository.findFirstActiveCashAccount().ifPresent(account -> {
                String concept = "Diferencia de arqueo sesión " + session.getSessionNumber();
                FinancialMovement adj = variance.signum() > 0
                        ? FinancialMovement.createIncome(account, variance.abs(), concept,
                                session.getSessionNumber(), session.getId())
                        : FinancialMovement.createExpense(account, variance.abs(), concept,
                                session.getSessionNumber(), session.getId());
                financialMovementRepository.save(adj);
                financialAccountRepository.save(account);
                log.info("Diferencia de arqueo {} registrada en Finance para sesión {}",
                        variance, session.getSessionNumber());
            });
        }

        log.info("Sesión {} cerrada. Esperado={}, Contado={}, Diferencia={}",
                session.getSessionNumber(), expected, req.countedBalance(), variance);
        return CashSessionResponse.from(session);
    }

    // ── Manual movement ───────────────────────────────────────────────────────

    @Transactional
    @SuppressWarnings("null")
    public CashMovementResponse createManualMovement(UUID sessionId, CashMovementRequest req) {
        CashSession session = cashSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));

        if (session.getStatus() != CashSessionStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Solo se pueden registrar movimientos en una sesión abierta");
        }

        if (req.direction() == CashMovementDirection.OUT && req.paymentMethod() == CashPaymentMethod.CASH) {
            UUID sid = session.getId();
            BigDecimal cashIn  = movementRepository.sumCashIn(sid);
            BigDecimal cashOut = movementRepository.sumCashOut(sid);
            BigDecimal available = session.getOpeningBalance().add(cashIn).subtract(cashOut);
            if (req.amount().compareTo(available) > 0) {
                throw new InsufficientCashException(
                        "El egreso de " + req.amount().stripTrailingZeros().toPlainString() +
                        " supera el efectivo disponible (" + available.stripTrailingZeros().toPlainString() + ")");
            }
        }

        CashMovementType type = req.direction() == CashMovementDirection.IN
                ? CashMovementType.MANUAL_INCOME
                : CashMovementType.MANUAL_EXPENSE;

        CashSessionMovement movement = CashSessionMovement.create(
                session, type, req.direction(), req.paymentMethod(),
                req.amount(), null, req.description(), currentUserId());
        movementRepository.save(movement);
        return CashMovementResponse.from(movement);
    }

    // ── Movements list ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<CashMovementResponse> getMovements(UUID sessionId, Pageable pageable) {
        if (!cashSessionRepository.existsById(sessionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada");
        }
        return movementRepository
                .findBySessionIdOrderByCreatedAtDesc(sessionId, pageable)
                .map(CashMovementResponse::from);
    }

    // ── History ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CashSessionResponse> getHistory(Pageable pageable) {
        return cashSessionRepository
                .findAllByDeletedAtIsNullOrderByOpenedAtDesc(pageable)
                .map(CashSessionResponse::from);
    }

    // ── Automatic movements (called from within other services' transactions) ──

    /**
     * Records a movement only if the given financial account is a CASH-type account
     * and there is an open session. Silently skips if either condition is not met.
     */
    public void autoMovementIfCashAccount(UUID financialAccountId, CashMovementType type,
                                           CashMovementDirection direction, BigDecimal amount,
                                           String reference, String description) {
        if (financialAccountId == null || amount == null || amount.signum() <= 0) return;
        financialAccountRepository.findByIdAndDeletedAtIsNull(financialAccountId)
                .filter(a -> a.getAccountType() == FinancialAccountType.CASH)
                .ifPresent(a -> autoMovement(type, direction, CashPaymentMethod.CASH,
                        amount, reference, description));
    }

    /**
     * Records a movement in the current open session with the given payment method.
     * Silently skips if no session is open.
     */
    @SuppressWarnings("null")
    public void autoMovement(CashMovementType type, CashMovementDirection direction,
                               CashPaymentMethod paymentMethod, BigDecimal amount,
                               String reference, String description) {
        if (amount == null || amount.signum() <= 0) return;
        cashSessionRepository.findFirstByStatusAndDeletedAtIsNull(CashSessionStatus.OPEN)
                .ifPresentOrElse(
                        session -> {
                            CashSessionMovement m = CashSessionMovement.create(
                                    session, type, direction, paymentMethod,
                                    amount, reference, description, currentUserIdOrNull());
                            movementRepository.save(m);
                        },
                        () -> log.debug("Sin sesión de caja abierta; omitiendo movimiento automático [{}]", type)
                );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @SuppressWarnings("null")
    private User resolveCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        try {
            return userRepository.findById(UUID.fromString(auth.getName()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }

    private UUID currentUserIdOrNull() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return null;
            return UUID.fromString(auth.getName());
        } catch (Exception e) {
            return null;
        }
    }

    private UUID currentUserId() {
        UUID id = currentUserIdOrNull();
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return id;
    }

    private String generateSessionNumber() {
        int year = Year.now().getValue();
        int seq = cashSessionRepository.findMaxSessionSequence() + 1;
        return String.format("CS-%d-%03d", year, seq);
    }
}
