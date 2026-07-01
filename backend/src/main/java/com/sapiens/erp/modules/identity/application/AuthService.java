package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.api.dto.LoginRequest;
import com.sapiens.erp.modules.identity.api.dto.LoginResponse;
import com.sapiens.erp.modules.identity.domain.RefreshToken;
import com.sapiens.erp.modules.identity.domain.RefreshTokenRepository;
import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.identity.infrastructure.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        if (!user.isEnabled()) {
            throw new BadCredentialsException("User account is disabled");
        }

        user.recordLogin();

        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = jwtService.generateRawToken();
        String tokenHash = jwtService.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.create(
                user,
                tokenHash,
                Instant.now().plusMillis(refreshTokenExpiration)
        );
        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(
                accessToken,
                rawRefreshToken,
                user.getId(),
                user.getName(),
                user.getRole().name()
        );
    }

    @Transactional
    public LoginResponse refresh(String rawToken) {
        String tokenHash = jwtService.hashToken(rawToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (!rt.isValid()) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        rt.revoke();

        User user = rt.getUser();
        String accessToken = jwtService.generateAccessToken(user);
        String newRawToken = jwtService.generateRawToken();
        String newHash = jwtService.hashToken(newRawToken);

        RefreshToken newRt = RefreshToken.create(
                user,
                newHash,
                Instant.now().plusMillis(refreshTokenExpiration)
        );
        refreshTokenRepository.save(newRt);

        return new LoginResponse(
                accessToken,
                newRawToken,
                user.getId(),
                user.getName(),
                user.getRole().name()
        );
    }

    @Transactional
    public void logout(String rawToken) {
        String tokenHash = jwtService.hashToken(rawToken);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(RefreshToken::revoke);
    }
}
