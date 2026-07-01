package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.ExecutionFeedbackRequest;
import com.sapiens.erp.modules.project.api.dto.PromptPlanRequest;
import com.sapiens.erp.modules.project.api.dto.PromptPlanResponse;
import com.sapiens.erp.modules.project.application.PromptPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prompt-plans")
@RequiredArgsConstructor
public class PromptPlanController {

    private final PromptPlanService service;

    @GetMapping
    public ResponseEntity<List<PromptPlanResponse>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @PostMapping
    public ResponseEntity<PromptPlanResponse> create(@Valid @RequestBody PromptPlanRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PromptPlanResponse> update(@PathVariable UUID id,
                                                     @Valid @RequestBody PromptPlanRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PromptPlanResponse> updateStatus(@PathVariable UUID id,
                                                           @RequestParam String status) {
        return ResponseEntity.ok(service.updateStatus(id, status));
    }

    @PatchMapping("/{id}/execution")
    public ResponseEntity<PromptPlanResponse> recordExecution(@PathVariable UUID id,
                                                              @RequestBody ExecutionFeedbackRequest req) {
        return ResponseEntity.ok(service.recordExecution(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
