package com.sapiens.erp.shared.api;

import com.sapiens.erp.modules.finance.domain.exception.ExpenseAlreadyReconciledException;
import com.sapiens.erp.modules.finance.domain.exception.InsufficientCashException;
import com.sapiens.erp.modules.finance.domain.exception.PaymentExceedsBalanceException;
import com.sapiens.erp.modules.finance.domain.exception.ReceivableHasActivePaymentsException;
import com.sapiens.erp.modules.inventory.domain.exception.InsufficientStockException;
import com.sapiens.erp.modules.storefront.domain.exception.StorefrontAuthException;
import com.sapiens.erp.modules.storefront.domain.exception.StorefrontOutOfStockException;
import com.sapiens.erp.modules.inventory.domain.exception.InsufficientStockAtLocationException;
import com.sapiens.erp.modules.inventory.domain.exception.LocationHasStockException;
import com.sapiens.erp.modules.inventory.domain.exception.LocationNotFoundException;
import com.sapiens.erp.modules.inventory.domain.exception.SameLocationTransferException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "VALIDATION_ERROR", message));
    }

    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(422, "INSUFFICIENT_STOCK", ex.getMessage()));
    }

    @ExceptionHandler(InsufficientStockAtLocationException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStockAtLocation(InsufficientStockAtLocationException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(422, "INSUFFICIENT_STOCK_AT_LOCATION", ex.getMessage()));
    }

    @ExceptionHandler(LocationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleLocationNotFound(LocationNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "LOCATION_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(LocationHasStockException.class)
    public ResponseEntity<ErrorResponse> handleLocationHasStock(LocationHasStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "LOCATION_HAS_STOCK", ex.getMessage()));
    }

    @ExceptionHandler(SameLocationTransferException.class)
    public ResponseEntity<ErrorResponse> handleSameLocationTransfer(SameLocationTransferException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(400, "SAME_LOCATION_TRANSFER", ex.getMessage()));
    }

    @ExceptionHandler(ExpenseAlreadyReconciledException.class)
    public ResponseEntity<ErrorResponse> handleExpenseReconciled(ExpenseAlreadyReconciledException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(422, "EXPENSE_RECONCILED", ex.getMessage()));
    }

    @ExceptionHandler(ReceivableHasActivePaymentsException.class)
    public ResponseEntity<ErrorResponse> handleReceivableHasActivePayments(ReceivableHasActivePaymentsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "RECEIVABLE_HAS_ACTIVE_PAYMENTS", ex.getMessage()));
    }

    @ExceptionHandler(InsufficientCashException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientCash(InsufficientCashException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(422, "INSUFFICIENT_CASH", ex.getMessage()));
    }

    @ExceptionHandler(PaymentExceedsBalanceException.class)
    public ResponseEntity<ErrorResponse> handlePaymentExceedsBalance(PaymentExceedsBalanceException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ErrorResponse.of(422, "PAYMENT_EXCEEDS_BALANCE", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "UNAUTHORIZED", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "FORBIDDEN", "You do not have permission for this operation"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "CONFLICT", ex.getMessage()));
    }

    /** 422 con el detalle de la presentación, para que la tienda pueda señalarla. */
    @ExceptionHandler(StorefrontOutOfStockException.class)
    public ResponseEntity<StorefrontOutOfStockResponse> handleStorefrontOutOfStock(
            StorefrontOutOfStockException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new StorefrontOutOfStockResponse(
                        422, "INSUFFICIENT_STOCK", ex.getMessage(),
                        ex.getPresentationId(), ex.getProductName(), ex.getPresentationName(),
                        java.time.Instant.now()));
    }

    public record StorefrontOutOfStockResponse(
            int status, String error, String message,
            java.util.UUID presentationId, String productName, String presentationName,
            java.time.Instant timestamp) {}

    @ExceptionHandler(StorefrontAuthException.class)
    public ResponseEntity<ErrorResponse> handleStorefrontAuth(StorefrontAuthException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "UNAUTHORIZED", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(500, "INTERNAL_ERROR", "Internal server error"));
    }
}
