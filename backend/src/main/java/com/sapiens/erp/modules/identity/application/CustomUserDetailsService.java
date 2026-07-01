package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.domain.User;
import com.sapiens.erp.modules.identity.domain.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmailAndDeletedAtIsNull(email)
                .map(this::toUserDetails)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    public UserDetails loadUserById(UUID id) {
        return userRepository.findById(id)
                .filter(u -> u.isEnabled() && u.isActive())
                .map(this::toUserDetails)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
    }

    private UserDetails toUserDetails(User u) {
        return new org.springframework.security.core.userdetails.User(
                u.getId().toString(),
                u.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name()))
        );
    }
}
