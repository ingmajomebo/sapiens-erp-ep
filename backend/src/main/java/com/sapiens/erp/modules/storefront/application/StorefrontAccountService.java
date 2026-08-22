package com.sapiens.erp.modules.storefront.application;

import com.sapiens.erp.modules.storefront.api.dto.StorefrontDtos.*;
import com.sapiens.erp.modules.storefront.domain.StorefrontAccount;
import com.sapiens.erp.modules.storefront.domain.StorefrontAccountRepository;
import com.sapiens.erp.modules.storefront.domain.exception.StorefrontAuthException;
import com.sapiens.erp.modules.storefront.infrastructure.StorefrontTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Registro e inicio de sesión de los clientes de la tienda. */
@Service
@RequiredArgsConstructor
public class StorefrontAccountService {

    private final StorefrontAccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final StorefrontTokenService tokenService;

    @Transactional
    public SessionResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (accountRepository.existsByEmailIgnoreCaseAndDeletedAtIsNull(email)) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo");
        }
        StorefrontAccount account = StorefrontAccount.create(
                email, passwordEncoder.encode(req.password()), req.name(), req.phone());
        account.setLastLoginAt(Instant.now());
        return toSession(accountRepository.save(account));
    }

    @Transactional
    public SessionResponse login(LoginRequest req) {
        StorefrontAccount account = accountRepository
                .findByEmailIgnoreCaseAndDeletedAtIsNull(req.email().trim().toLowerCase())
                .orElseThrow(StorefrontAuthException::new);

        if (!passwordEncoder.matches(req.password(), account.getPasswordHash())) {
            throw new StorefrontAuthException();
        }
        account.setLastLoginAt(Instant.now());
        return toSession(accountRepository.save(account));
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(UUID accountId) {
        return toAccount(accountRepository.findByIdAndDeletedAtIsNull(accountId)
                .orElseThrow(StorefrontAuthException::new));
    }

    private SessionResponse toSession(StorefrontAccount account) {
        return new SessionResponse(tokenService.generateToken(account), toAccount(account));
    }

    private AccountResponse toAccount(StorefrontAccount a) {
        return new AccountResponse(a.getId(), a.getName(), a.getEmail(), a.getPhone());
    }
}
