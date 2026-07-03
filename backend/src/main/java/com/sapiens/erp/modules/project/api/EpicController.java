package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.EpicRequest;
import com.sapiens.erp.modules.project.api.dto.EpicResponse;
import com.sapiens.erp.modules.project.application.EpicService;
import com.sapiens.erp.modules.project.domain.EpicStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics")
@RequiredArgsConstructor
public class EpicController {

    private final EpicService service;

    @GetMapping
    public List<EpicResponse> list() {
        return service.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EpicResponse create(@Valid @RequestBody EpicRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public EpicResponse update(@PathVariable UUID id, @Valid @RequestBody EpicRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/status")
    public EpicResponse updateStatus(@PathVariable UUID id, @RequestParam String status) {
        return service.updateStatus(id, EpicStatus.valueOf(status));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
