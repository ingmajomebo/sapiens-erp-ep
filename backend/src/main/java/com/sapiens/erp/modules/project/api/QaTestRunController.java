package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.QaTestRunDetailResponse;
import com.sapiens.erp.modules.project.api.dto.QaTestRunRequest;
import com.sapiens.erp.modules.project.api.dto.QaTestRunResponse;
import com.sapiens.erp.modules.project.application.QaTestRunService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/qa/test-runs")
@RequiredArgsConstructor
public class QaTestRunController {

    private final QaTestRunService service;

    @GetMapping
    public List<QaTestRunResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String runType,
            @RequestParam(required = false) UUID sprintId) {
        return service.listFiltered(status, runType, sprintId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QaTestRunResponse create(@Valid @RequestBody QaTestRunRequest req) {
        return service.create(req);
    }

    @GetMapping("/{id}")
    public QaTestRunDetailResponse detail(@PathVariable UUID id) {
        return service.getDetail(id);
    }

    @PostMapping("/{id}/close")
    public QaTestRunResponse close(@PathVariable UUID id) {
        return service.close(id);
    }
}
