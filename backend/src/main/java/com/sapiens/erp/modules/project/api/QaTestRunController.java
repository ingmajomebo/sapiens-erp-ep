package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.QaCoverageResponse;
import com.sapiens.erp.modules.project.api.dto.QaRunTreeResponse;
import com.sapiens.erp.modules.project.api.dto.QaTestRunDetailResponse;
import com.sapiens.erp.modules.project.api.dto.QaTestRunRequest;
import com.sapiens.erp.modules.project.api.dto.QaTestRunResponse;
import com.sapiens.erp.modules.project.application.QaReportService;
import com.sapiens.erp.modules.project.application.QaTestRunService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/qa")
@RequiredArgsConstructor
public class QaTestRunController {

    private final QaTestRunService service;
    private final QaReportService reportService;

    @GetMapping("/test-runs")
    public List<QaTestRunResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String runType,
            @RequestParam(required = false) UUID sprintId) {
        return service.listFiltered(status, runType, sprintId);
    }

    @PostMapping("/test-runs")
    @ResponseStatus(HttpStatus.CREATED)
    public QaTestRunResponse create(@Valid @RequestBody QaTestRunRequest req) {
        return service.create(req);
    }

    @GetMapping("/test-runs/{id}")
    public QaTestRunDetailResponse detail(@PathVariable UUID id) {
        return service.getDetail(id);
    }

    @PostMapping("/test-runs/{id}/close")
    public QaTestRunResponse close(@PathVariable UUID id) {
        return service.close(id);
    }

    @DeleteMapping("/test-runs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/test-runs/{id}/tree")
    public QaRunTreeResponse tree(@PathVariable UUID id) {
        return reportService.getRunTree(id);
    }

    @GetMapping("/coverage")
    public QaCoverageResponse coverage(
            @RequestParam(required = false) UUID epicId,
            @RequestParam(required = false) String module) {
        return reportService.getCoverage(epicId, module);
    }
}
