package com.sapiens.erp.modules.identity.application;

import com.sapiens.erp.modules.identity.api.dto.PermissionDto;
import com.sapiens.erp.modules.identity.api.dto.RoleRequest;
import com.sapiens.erp.modules.identity.api.dto.RoleResponse;
import com.sapiens.erp.modules.identity.domain.Permission;
import com.sapiens.erp.modules.identity.domain.PermissionRepository;
import com.sapiens.erp.modules.identity.domain.UserRole;
import com.sapiens.erp.modules.identity.domain.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final UserRoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionCacheService permissionCacheService;

    @Transactional(readOnly = true)
    public List<RoleResponse> listAll() {
        return roleRepository.findAllByDeletedAtIsNullOrderByName().stream()
                .map(this::toResponse)
                .toList();
    }

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public RoleResponse getById(UUID id) {
        UserRole role = roleRepository.findById(id)
                .filter(r -> r.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rol no encontrado"));
        return toResponse(role);
    }

    @SuppressWarnings("null")
    @Transactional
    public RoleResponse create(RoleRequest req) {
        String normalizedName = req.name().toUpperCase().trim();
        roleRepository.findByNameAndDeletedAtIsNull(normalizedName).ifPresent(r -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un rol con ese nombre");
        });
        UserRole role = UserRole.create(req.name(), req.description());
        List<Permission> perms = permissionRepository.findAllById(req.permissionIds());
        role.setPermissions(perms);
        return toResponse(roleRepository.save(role));
    }

    @SuppressWarnings("null")
    @Transactional
    public RoleResponse update(UUID id, RoleRequest req) {
        UserRole role = roleRepository.findById(id)
                .filter(r -> r.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rol no encontrado"));

        String normalizedName = req.name().toUpperCase().trim();
        if (!role.getName().equals(normalizedName)) {
            roleRepository.findByNameAndDeletedAtIsNull(normalizedName).ifPresent(r -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un rol con ese nombre");
            });
            if (!role.isSystem()) {
                role.setName(normalizedName);
            }
        }
        role.setDescription(req.description());

        List<Permission> perms = permissionRepository.findAllById(req.permissionIds());
        role.setPermissions(perms);

        UserRole saved = roleRepository.save(role);
        permissionCacheService.evict(saved.getId());
        return toResponse(saved);
    }

    @SuppressWarnings("null")
    @Transactional
    public void delete(UUID id) {
        UserRole role = roleRepository.findById(id)
                .filter(r -> r.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rol no encontrado"));

        if (role.isSystem()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Los roles del sistema no se pueden eliminar");
        }
        if (roleRepository.countUsersByRoleId(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar un rol que tiene usuarios asignados");
        }
        role.softDelete();
        roleRepository.save(role);
        permissionCacheService.evict(id);
    }

    @Transactional(readOnly = true)
    public List<PermissionDto> listPermissions() {
        return permissionRepository.findAllByOrderByModuleAscCodeAsc().stream()
                .map(p -> new PermissionDto(p.getId(), p.getCode(), p.getDescription(), p.getModule()))
                .toList();
    }

    @SuppressWarnings("null")
    private RoleResponse toResponse(UserRole role) {
        List<String> codes = role.getPermissions().stream().map(Permission::getCode).toList();
        long userCount = roleRepository.countUsersByRoleId(role.getId());
        return new RoleResponse(role.getId(), role.getName(), role.getDescription(),
                role.isSystem(), codes, userCount);
    }
}
