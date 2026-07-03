package com.sapiens.erp.modules.project;

import com.sapiens.erp.modules.project.api.dto.TestExecutionRequest;
import com.sapiens.erp.modules.project.api.dto.TestExecutionResponse;
import com.sapiens.erp.modules.project.application.QaExecutionService;
import com.sapiens.erp.modules.project.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QaExecutionService — derivación de estado y reglas de run")
class QaExecutionServiceTest {

    @Mock UserStoryRepository storyRepository;
    @Mock StoryScenarioRepository scenarioRepository;
    @Mock ScenarioTestExecutionRepository executionRepository;
    @Mock ProjectTaskRepository taskRepository;
    @Mock QaTestRunRepository runRepository;
    @Mock QaTestRunItemRepository runItemRepository;
    @Mock com.sapiens.erp.modules.identity.domain.UserRepository userRepository;
    @Mock QaExecutionAttachmentRepository attachmentRepository;
    @InjectMocks QaExecutionService service;

    private UserStory story;
    private StoryScenario sc1;
    private StoryScenario sc2;

    private static TestExecutionRequest req(TestResult result, Boolean createDefect, UUID runId) {
        return new TestExecutionRequest(result, TaskAssignee.ISKIAN, "notas", createDefect,
                null, TaskAssignee.MANUEL, runId, null, null);
    }

    @BeforeEach
    void setUp() {
        story = UserStory.create("RF-T1", null, StoryType.FUNCTIONAL,
                "tester", "probar", "validar", null, "project", TaskPriority.HIGH, null, null);
        sc1 = StoryScenario.create(story, "Escenario 1", "G", "W", "T", ScenarioType.HAPPY_PATH, 0);
        sc2 = StoryScenario.create(story, "Escenario 2", "G", "W", "T", ScenarioType.NEGATIVE, 1);
        story.getScenarios().addAll(List.of(sc1, sc2));

        lenient().when(storyRepository.findByIdAndDeletedAtIsNull(story.getId())).thenReturn(Optional.of(story));
        lenient().when(scenarioRepository.findByIdAndDeletedAtIsNull(sc1.getId())).thenReturn(Optional.of(sc1));
        lenient().when(scenarioRepository.findByIdAndDeletedAtIsNull(sc2.getId())).thenReturn(Optional.of(sc2));
    }

    @Nested
    @DisplayName("derivación de estado (ejecución suelta)")
    class Derivation {

        @Test
        @DisplayName("FAIL deriva QA_FAILED y crea task BUG cuando createDefect=true")
        void failDerivesQaFailed() {
            when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            TestExecutionResponse res = service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.FAIL, true, null));

            assertThat(res.storyStatusAfter()).isEqualTo(StoryStatus.QA_FAILED);
            assertThat(res.defectTaskId()).isNotNull();
            verify(taskRepository).save(argThat(t ->
                    t.getTaskType() == TaskType.BUG
                            && t.getPriority() == TaskPriority.HIGH
                            && t.getUserStory() == story));
        }

        @Test
        @DisplayName("PASS parcial deja la historia IN_QA")
        void partialPassDerivesInQa() {
            when(executionRepository.findByStoryId(story.getId())).thenReturn(List.of());

            TestExecutionResponse res = service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, null));

            assertThat(res.storyStatusAfter()).isEqualTo(StoryStatus.IN_QA);
        }

        @Test
        @DisplayName("todos los escenarios con último PASS derivan DONE")
        void allPassDerivesDone() {
            ScenarioTestExecution prev = ScenarioTestExecution.create(
                    story, sc2, TestResult.PASS, TaskAssignee.ISKIAN, null);
            when(executionRepository.findByStoryId(story.getId())).thenReturn(List.of(prev));

            TestExecutionResponse res = service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, null));

            assertThat(res.storyStatusAfter()).isEqualTo(StoryStatus.DONE);
        }

        @Test
        @DisplayName("los escenarios inactivos no cuentan para DONE")
        void inactiveScenariosExcluded() {
            sc2.setIsActive(false);
            when(executionRepository.findByStoryId(story.getId())).thenReturn(List.of());

            TestExecutionResponse res = service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, null));

            assertThat(res.storyStatusAfter()).isEqualTo(StoryStatus.DONE);
        }

        @Test
        @DisplayName("escenario ajeno a la historia → IllegalArgumentException")
        void foreignScenarioRejected() {
            UserStory other = UserStory.create("RF-T2", null, StoryType.FUNCTIONAL,
                    null, null, null, null, null, TaskPriority.LOW, null, null);
            StoryScenario foreign = StoryScenario.create(other, "Ajeno", "G", "W", "T", ScenarioType.EDGE, 0);
            when(scenarioRepository.findByIdAndDeletedAtIsNull(foreign.getId())).thenReturn(Optional.of(foreign));

            assertThatThrownBy(() -> service.recordExecution(
                    story.getId(), foreign.getId(), req(TestResult.PASS, false, null)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("no pertenece");
        }
    }

    @Nested
    @DisplayName("ejecución dentro de un run")
    class WithinRun {

        @Test
        @DisplayName("run cerrado rechaza ejecuciones")
        void closedRunRejected() {
            QaTestRun run = QaTestRun.create("RUN-99", "Cerrado", RunType.REGRESSION,
                    null, null, null, null, null);
            run.setStatus(RunStatus.CLOSED);
            when(runRepository.findByIdAndDeletedAtIsNull(run.getId())).thenReturn(Optional.of(run));

            assertThatThrownBy(() -> service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, run.getId())))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cerrado");
        }

        @Test
        @DisplayName("escenario fuera del alcance del run rechazado")
        void outOfScopeRejected() {
            QaTestRun run = QaTestRun.create("RUN-98", "Abierto", RunType.SMOKE, null, null, null, null, null);
            when(runRepository.findByIdAndDeletedAtIsNull(run.getId())).thenReturn(Optional.of(run));
            when(runItemRepository.existsByRunIdAndScenarioIdAndDeletedAtIsNull(run.getId(), sc1.getId()))
                    .thenReturn(false);

            assertThatThrownBy(() -> service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, run.getId())))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("alcance");
        }

        @Test
        @DisplayName("la ejecución hereda build y ambiente del run y guarda snapshot")
        void inheritsRunContextAndSnapshot() {
            QaTestRun run = QaTestRun.create("RUN-97", "Abierto", RunType.FEATURE,
                    "v9.9", RunEnvironment.QA, null, null, null);
            when(runRepository.findByIdAndDeletedAtIsNull(run.getId())).thenReturn(Optional.of(run));
            when(runItemRepository.existsByRunIdAndScenarioIdAndDeletedAtIsNull(run.getId(), sc1.getId()))
                    .thenReturn(true);
            when(executionRepository.findByStoryId(story.getId())).thenReturn(List.of());

            TestExecutionResponse res = service.recordExecution(
                    story.getId(), sc1.getId(), req(TestResult.PASS, false, run.getId()));

            assertThat(res.buildVersion()).isEqualTo("v9.9");
            assertThat(res.environment()).isEqualTo(RunEnvironment.QA);
            assertThat(res.scenarioSnapshot())
                    .containsEntry("givenConditions", "G")
                    .containsEntry("version", 1);
        }
    }
}
