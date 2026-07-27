package com.sapiens.erp.modules.identity.api;

import com.sapiens.erp.modules.identity.api.dto.PermissionDto;
import com.sapiens.erp.modules.identity.api.dto.RoleRequest;
import com.sapiens.erp.modules.identity.api.dto.RoleResponse;
import com.sapiens.erp.modules.identity.application.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<List<RoleResponse>> listAll() {
        return ResponseEntity.ok(roleService.listAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<RoleResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(roleService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<RoleResponse> update(@PathVariable UUID id,
                                               @Valid @RequestBody RoleRequest req) {
        return ResponseEntity.ok(roleService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('IDENTITY_ROLE_MANAGE')")
    public ResponseEntity<List<PermissionDto>> listPermissions() {
        return ResponseEntity.ok(roleService.listPermissions());
    }
}
