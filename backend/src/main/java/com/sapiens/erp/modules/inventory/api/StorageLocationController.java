package com.sapiens.erp.modules.inventory.api;

import com.sapiens.erp.modules.inventory.api.dto.StorageLocationRequest;
import com.sapiens.erp.modules.inventory.api.dto.StorageLocationResponse;
import com.sapiens.erp.modules.inventory.application.StorageLocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/storage-locations")
@RequiredArgsConstructor
public class StorageLocationController {

    private final StorageLocationService storageLocationService;

    @GetMapping
    public List<StorageLocationResponse> listAll() {
        return storageLocationService.listAll();
    }

    @GetMapping("/default")
    public StorageLocationResponse getDefault() {
        return storageLocationService.getDefaultLocation();
    }

    @PostMapping
    public ResponseEntity<StorageLocationResponse> create(@Valid @RequestBody StorageLocationRequest req) {
        StorageLocationResponse created = storageLocationService.create(req);
        return ResponseEntity
                .created(URI.create("/api/v1/storage-locations/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public StorageLocationResponse update(@PathVariable UUID id,
                                          @Valid @RequestBody StorageLocationRequest req) {
        return storageLocationService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        storageLocationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
