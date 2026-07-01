package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.SprintRequest;
import com.sapiens.erp.modules.project.api.dto.SprintResponse;
import com.sapiens.erp.modules.project.application.SprintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService service;

    @GetMapping
    public ResponseEntity<List<SprintResponse>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping
    public ResponseEntity<SprintResponse> create(@Valid @RequestBody SprintRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<SprintResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(service.activate(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<SprintResponse> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(service.complete(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
