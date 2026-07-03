package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.shared.api.PagedResponse;
import com.sapiens.erp.modules.project.api.dto.StoryQaHistoryResponse;
import com.sapiens.erp.modules.project.api.dto.StoryScenarioRequest;
import com.sapiens.erp.modules.project.api.dto.StoryScenarioResponse;
import com.sapiens.erp.modules.project.api.dto.TestExecutionRequest;
import com.sapiens.erp.modules.project.api.dto.TestExecutionResponse;
import com.sapiens.erp.modules.project.api.dto.UserStoryRequest;
import com.sapiens.erp.modules.project.api.dto.UserStoryResponse;
import com.sapiens.erp.modules.project.application.QaExecutionService;
import com.sapiens.erp.modules.project.application.QaReportService;
import com.sapiens.erp.modules.project.application.UserStoryService;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-stories")
@RequiredArgsConstructor
public class UserStoryController {

    private final UserStoryService service;
    private final QaExecutionService qaService;
    private final QaReportService qaReportService;

    /**
     * Retrocompatible: sin page/size devuelve el array plano de siempre;
     * con page/size devuelve el envoltorio { content, page, size, totalElements }.
     */
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String storyType,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        List<UserStoryResponse> all = service.listFiltered(storyType, module, status, q);
        if (page == null || size == null) {
            return ResponseEntity.ok(all);
        }
        return ResponseEntity.ok(PagedResponse.of(all, page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserStoryResponse create(@Valid @RequestBody UserStoryRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public UserStoryResponse update(@PathVariable UUID id, @Valid @RequestBody UserStoryRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/status")
    public UserStoryResponse updateStatus(@PathVariable UUID id,
                                          @RequestParam String status,
                                          @RequestParam(defaultValue = "false") boolean force) {
        return service.updateStatus(id, StoryStatus.valueOf(status), force);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    // ── Scenarios ────────────────────────────────────────────────────────────

    @PostMapping("/{storyId}/scenarios")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryScenarioResponse addScenario(@PathVariable UUID storyId,
                                              @Valid @RequestBody StoryScenarioRequest req) {
        return service.addScenario(storyId, req);
    }

    @PutMapping("/scenarios/{scenarioId}")
    public StoryScenarioResponse updateScenario(@PathVariable UUID scenarioId,
                                                 @Valid @RequestBody StoryScenarioRequest req) {
        return service.updateScenario(scenarioId, req);
    }

    @DeleteMapping("/scenarios/{scenarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScenario(@PathVariable UUID scenarioId) {
        service.deleteScenario(scenarioId);
    }

    @PatchMapping("/scenarios/{scenarioId}/tags")
    public StoryScenarioResponse updateScenarioTags(@PathVariable UUID scenarioId,
                                                    @RequestBody TagsRequest req) {
        return service.updateScenarioTags(scenarioId, req.tags());
    }

    public record TagsRequest(List<String> tags) {}

    // ── QA: ejecuciones de prueba ────────────────────────────────────────────

    @GetMapping("/{storyId}/test-executions")
    public ResponseEntity<?> listExecutions(@PathVariable UUID storyId,
                                            @RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size) {
        List<TestExecutionResponse> all = qaService.listByStory(storyId);
        if (page == null || size == null) {
            return ResponseEntity.ok(all);
        }
        return ResponseEntity.ok(PagedResponse.of(all, page, size));
    }

    @GetMapping("/{storyId}/qa-history")
    public List<StoryQaHistoryResponse> qaHistory(@PathVariable UUID storyId) {
        return qaReportService.getStoryHistory(storyId);
    }

    @PostMapping("/{storyId}/scenarios/{scenarioId}/test-executions")
    @ResponseStatus(HttpStatus.CREATED)
    public TestExecutionResponse recordExecution(@PathVariable UUID storyId,
                                                 @PathVariable UUID scenarioId,
                                                 @Valid @RequestBody TestExecutionRequest req) {
        return qaService.recordExecution(storyId, scenarioId, req);
    }
}
