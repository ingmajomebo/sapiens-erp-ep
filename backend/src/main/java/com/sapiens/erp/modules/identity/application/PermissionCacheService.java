package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.domain.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PermissionCacheService {

    private final PermissionRepository permissionRepository;

    @Cacheable(value = "role-permissions", key = "#roleId")
    @Transactional(readOnly = true)
    public List<String> getPermissionCodes(UUID roleId) {
        return permissionRepository.findCodesByRoleId(roleId);
    }

    @CacheEvict(value = "role-permissions", key = "#roleId")
    public void evict(UUID roleId) {}

    @CacheEvict(value = "role-permissions", allEntries = true)
    public void evictAll() {}
}
