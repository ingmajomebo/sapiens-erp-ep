package com.sapiens.erp.modules.identity.infrastructure;

import com.sapiens.erp.modules.identity.domain.Role;
import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!userRepository.existsByEmailAndDeletedAtIsNull("admin@sapiens.com")) {
            String hash = passwordEncoder.encode("Admin1234!");
            User admin = User.create("Administrator", "admin@sapiens.com", hash, Role.ADMIN);
            userRepository.save(admin);
            log.info("Admin user created: admin@sapiens.com / Admin1234!");
        }
    }
}
