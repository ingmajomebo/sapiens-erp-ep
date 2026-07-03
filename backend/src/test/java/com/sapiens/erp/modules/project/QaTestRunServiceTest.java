package com.sapiens.erp.modules.project;

import com.sapiens.erp.modules.project.api.dto.QaTestRunRequest;
import com.sapiens.erp.modules.project.api.dto.QaTestRunResponse;
import com.sapiens.erp.modules.project.application.QaTestRunService;
import com.sapiens.erp.modules.project.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QaTestRunService — alcances y cierre")
class QaTestRunServiceTest {

    @Mock QaTestRunRepository runRepository;
    @Mock QaTestRunItemRepository itemRepository;
    @Mock ScenarioTestExecutionRepository executionRepository;
    @Mock StoryScenarioRepository scenarioRepository;
    @Mock SprintRepository sprintRepository;
    @InjectMocks QaTestRunService service;

    private UserStory story;
    private StoryScenario scenario;

    @BeforeEach
    void setUp() {
        story = UserStory.create("RF-RUN", null, StoryType.FUNCTIONAL,
                null, "probar runs", null, null, "project", TaskPriority.MEDIUM, null, null);
        scenario = StoryScenario.create(story, "Escenario", "G", "W", "T", ScenarioType.HAPPY_PATH, 0);
    }

    private static QaTestRunRequest request(QaTestRunRequest.Scope scope) {
        return new QaTestRunRequest("Mi run", RunType.REGRESSION, "v1", RunEnvironment.QA,
                TaskAssignee.ISKIAN, null, null, scope);
    }

    @Test
    @DisplayName("alcance TAG sin tag → IllegalArgumentException")
    void tagScopeRequiresTag() {
        assertThatThrownBy(() -> service.create(request(
                new QaTestRunRequest.Scope(QaTestRunRequest.ScopeType.TAG, null, null, null))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tag");
    }

    @Test
    @DisplayName("alcance vacío → IllegalArgumentException")
    void emptyScopeRejected() {
        when(scenarioRepository.findActiveByTag("regression")).thenReturn(List.of());
        assertThatThrownBy(() -> service.create(request(
                new QaTestRunRequest.Scope(QaTestRunRequest.ScopeType.TAG, "regression", null, null))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ningún escenario");
    }

    @Test
    @DisplayName("crear materializa items y autogenera código RUN-NN")
    void createMaterializesScope() {
        when(scenarioRepository.findActiveByTag("regression")).thenReturn(List.of(scenario));
        when(runRepository.existsByCodeAndDeletedAtIsNull("RUN-01")).thenReturn(false);
        when(runRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QaTestRunResponse res = service.create(request(
                new QaTestRunRequest.Scope(QaTestRunRequest.ScopeType.TAG, "regression", null, null)));

        assertThat(res.code()).isEqualTo("RUN-01");
        assertThat(res.status()).isEqualTo(RunStatus.OPEN);
        assertThat(res.totalItems()).isEqualTo(1);
        verify(itemRepository).save(argThat(i -> i.getScenario() == scenario && i.getStory() == story));
    }

    @Test
    @DisplayName("cerrar calcula el resumen con pendientes")
    void closeComputesSummary() {
        QaTestRun run = QaTestRun.create("RUN-05", "Cerrable", RunType.SMOKE, null, null, null, null, null);
        StoryScenario pendingScenario = StoryScenario.create(story, "Pendiente", "G", "W", "T", ScenarioType.EDGE, 1);
        QaTestRunItem item1 = QaTestRunItem.create(run, scenario, story);
        QaTestRunItem item2 = QaTestRunItem.create(run, pendingScenario, story);
        ScenarioTestExecution exec = ScenarioTestExecution.create(
                story, scenario, TestResult.PASS, TaskAssignee.ISKIAN, null);
        exec.setTestRun(run);

        when(runRepository.findByIdAndDeletedAtIsNull(run.getId())).thenReturn(Optional.of(run));
        when(itemRepository.findByRunId(run.getId())).thenReturn(List.of(item1, item2));
        when(executionRepository.findByRunId(run.getId())).thenReturn(List.of(exec));
        when(runRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QaTestRunResponse res = service.close(run.getId());

        assertThat(res.status()).isEqualTo(RunStatus.CLOSED);
        assertThat(res.closedAt()).isNotNull();
        assertThat(res.summary())
                .containsEntry("passed", 1)
                .containsEntry("pending", 1)
                .containsEntry("failed", 0);
    }

    @Test
    @DisplayName("cerrar un run ya cerrado → IllegalArgumentException")
    void closeClosedRejected() {
        QaTestRun run = QaTestRun.create("RUN-06", "Ya cerrado", RunType.HOTFIX, null, null, null, null, null);
        run.setStatus(RunStatus.CLOSED);
        when(runRepository.findByIdAndDeletedAtIsNull(run.getId())).thenReturn(Optional.of(run));

        assertThatThrownBy(() -> service.close(run.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cerrado");
    }

    @Test
    @DisplayName("run inexistente → IllegalArgumentException")
    void missingRunRejected() {
        UUID id = UUID.randomUUID();
        when(runRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.close(id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no encontrado");
    }
}
