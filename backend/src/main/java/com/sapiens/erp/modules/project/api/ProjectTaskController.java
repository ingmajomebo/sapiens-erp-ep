package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.ProjectTaskRequest;
import com.sapiens.erp.modules.project.api.dto.ProjectTaskResponse;
import com.sapiens.erp.modules.project.api.dto.TaskStatusUpdateRequest;
import com.sapiens.erp.modules.project.application.ProjectTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/project-tasks")
@RequiredArgsConstructor
public class ProjectTaskController {

    private final ProjectTaskService service;

    @GetMapping
    public ResponseEntity<List<ProjectTaskResponse>> list(
            @RequestParam(required = false) UUID sprintId,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.listFiltered(sprintId, assignee, status));
    }

    @PostMapping
    public ResponseEntity<ProjectTaskResponse> create(@Valid @RequestBody ProjectTaskRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectTaskResponse> update(@PathVariable UUID id,
                                                      @Valid @RequestBody ProjectTaskRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ProjectTaskResponse> updateStatus(@PathVariable UUID id,
                                                            @Valid @RequestBody TaskStatusUpdateRequest req) {
        return ResponseEntity.ok(service.updateStatus(id, req));
    }

    @PatchMapping("/{id}/hours")
    public ResponseEntity<ProjectTaskResponse> logHours(@PathVariable UUID id,
                                                        @RequestParam Integer hours) {
        return ResponseEntity.ok(service.logActualHours(id, hours));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
