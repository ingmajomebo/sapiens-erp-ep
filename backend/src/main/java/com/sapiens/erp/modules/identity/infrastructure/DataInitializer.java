package com.sapiens.erp.modules.identity.infrastructure;

import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import com.sapiens.erp.modules.identity.domain.UserRole;
import com.sapiens.erp.modules.identity.domain.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

/**
 * Crea el primer administrador si la base está vacía.
 * <p>
 * Las credenciales salen de {@code ADMIN_EMAIL} y {@code ADMIN_PASSWORD}.
 * En producción, si no están definidas no se crea nada: un usuario con
 * credenciales conocidas y publicadas en el repositorio es la primera
 * combinación que prueba cualquier escáner automatizado.
 * <p>
 * Fuera de producción sí hay un usuario de conveniencia, porque el coste de
 * equivocarse en una base local es nulo y el de no poder entrar, alto.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private static final String DEV_EMAIL = "admin@sapiens.com";
    private static final String DEV_PASSWORD = "Admin1234!";

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean isProduction = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        boolean configured = !adminEmail.isBlank() && !adminPassword.isBlank();

        if (!configured && isProduction) {
            if (userRepository.count() == 0) {
                log.error("No hay usuarios y ADMIN_EMAIL/ADMIN_PASSWORD no están definidas. "
                        + "Nadie puede entrar al sistema. Defínelas y reinicia.");
            }
            return;
        }

        String email = configured ? adminEmail.trim().toLowerCase() : DEV_EMAIL;
        String password = configured ? adminPassword : DEV_PASSWORD;

        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) return;

        UserRole adminRole = userRoleRepository.findByNameAndDeletedAtIsNull("ADMIN")
                .orElseThrow(() -> new IllegalStateException(
                        "No existe el rol ADMIN — ¿corrió la migración V35?"));

        userRepository.save(User.create("Administrador", email,
                passwordEncoder.encode(password), adminRole));

        if (configured) {
            // Nunca se registra la contraseña, ni en el arranque
            log.info("Administrador inicial creado: {}", email);
        } else {
            log.warn("Administrador de DESARROLLO creado: {} con contraseña por defecto. "
                    + "No usar fuera de local.", email);
        }
    }
}
