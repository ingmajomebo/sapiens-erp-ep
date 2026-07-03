package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.RunEnvironment;
import com.sapiens.erp.modules.project.domain.RunType;
import com.sapiens.erp.modules.project.domain.TaskAssignee;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record QaTestRunRequest(
        @NotBlank String name,
        RunType runType,
        String buildVersion,
        RunEnvironment environment,
        TaskAssignee openedBy,
        String notes,
        UUID sprintId,
        @NotNull Scope scope
) {
    /**
     * Alcance dinámico del run (patrón query-based suite):
     * TAG → escenarios activos con ese tag · EPIC → escenarios de las historias de la épica
     * · STORIES → historias específicas.
     */
    public record Scope(
            @NotNull ScopeType type,
            String tag,
            UUID epicId,
            List<UUID> storyIds
    ) {}

    public enum ScopeType { TAG, EPIC, STORIES }
}
