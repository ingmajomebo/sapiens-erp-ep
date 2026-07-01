package com.sapiens.erp.modules.project.api;

import com.sapiens.erp.modules.project.api.dto.StoryScenarioRequest;
import com.sapiens.erp.modules.project.api.dto.StoryScenarioResponse;
import com.sapiens.erp.modules.project.api.dto.UserStoryRequest;
import com.sapiens.erp.modules.project.api.dto.UserStoryResponse;
import com.sapiens.erp.modules.project.application.UserStoryService;
import com.sapiens.erp.modules.project.domain.StoryStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-stories")
@RequiredArgsConstructor
public class UserStoryController {

    private final UserStoryService service;

    @GetMapping
    public List<UserStoryResponse> list(
            @RequestParam(required = false) String storyType,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String status) {
        return service.listFiltered(storyType, module, status);
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
    public UserStoryResponse updateStatus(@PathVariable UUID id, @RequestParam String status) {
        return service.updateStatus(id, StoryStatus.valueOf(status));
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
}
