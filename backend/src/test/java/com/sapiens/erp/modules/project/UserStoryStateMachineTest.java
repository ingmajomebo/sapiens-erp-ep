package com.sapiens.erp.modules.project;

import com.sapiens.erp.modules.project.application.UserStoryService;
import com.sapiens.erp.modules.project.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserStoryService — máquina de estados")
class UserStoryStateMachineTest {

    @Mock UserStoryRepository storyRepository;
    @Mock StoryScenarioRepository scenarioRepository;
    @Mock EpicRepository epicRepository;
    @InjectMocks UserStoryService service;

    private UserStory story;

    @BeforeEach
    void setUp() {
        story = UserStory.create("RF-SM", null, StoryType.FUNCTIONAL,
                "dev", "probar", "validar", null, "project", TaskPriority.MEDIUM, null, null);
        lenient().when(storyRepository.findByIdAndDeletedAtIsNull(story.getId())).thenReturn(Optional.of(story));
        lenient().when(storyRepository.save(any(UserStory.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @ParameterizedTest(name = "{0} → {1} permitido")
    @CsvSource({
            "DEFINED, IN_DEV",
            "IN_DEV, REVIEW",
            "REVIEW, READY_FOR_QA",
            "REVIEW, IN_DEV",
            "READY_FOR_QA, IN_QA",
            "QA_FAILED, IN_DEV",
            "QA_FAILED, READY_FOR_QA",
    })
    void allowedTransitions(StoryStatus from, StoryStatus to) {
        story.setStatus(from);
        assertThat(service.updateStatus(story.getId(), to, false).status()).isEqualTo(to);
    }

    @ParameterizedTest(name = "{0} → {1} rechazado")
    @CsvSource({
            "DEFINED, DONE",
            "DEFINED, READY_FOR_QA",
            "IN_DEV, READY_FOR_QA",
            "IN_DEV, DONE",
            "READY_FOR_QA, DONE",
            "IN_QA, DONE",
            "IN_QA, QA_FAILED",
            "DONE, IN_DEV",
            "DONE, BLOCKED",
    })
    void forbiddenTransitions(StoryStatus from, StoryStatus to) {
        story.setStatus(from);
        assertThatThrownBy(() -> service.updateStatus(story.getId(), to, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Transición no permitida");
    }

    @Test
    @DisplayName("bloquear guarda el estado previo y solo permite volver a él")
    void blockedRemembersPreviousState() {
        story.setStatus(StoryStatus.REVIEW);
        service.updateStatus(story.getId(), StoryStatus.BLOCKED, false);
        assertThat(story.getPreviousStatus()).isEqualTo(StoryStatus.REVIEW);

        assertThatThrownBy(() -> service.updateStatus(story.getId(), StoryStatus.IN_DEV, false))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(service.updateStatus(story.getId(), StoryStatus.REVIEW, false).status())
                .isEqualTo(StoryStatus.REVIEW);
        assertThat(story.getPreviousStatus()).isNull();
    }

    @Test
    @DisplayName("force=true permite cualquier transición (corrección administrativa)")
    void forceBypassesValidation() {
        story.setStatus(StoryStatus.DONE);
        assertThat(service.updateStatus(story.getId(), StoryStatus.IN_DEV, true).status())
                .isEqualTo(StoryStatus.IN_DEV);
    }

    @Test
    @DisplayName("las RNF pueden completarse desde revisión (verificación documental)")
    void nfrCanCompleteFromReview() {
        UserStory nfr = UserStory.create("RNF-SM", null, StoryType.NON_FUNCTIONAL,
                null, null, null, "RNF", null, TaskPriority.MEDIUM,
                NfrCategory.PERFORMANCE, "criterio");
        nfr.setStatus(StoryStatus.REVIEW);
        when(storyRepository.findByIdAndDeletedAtIsNull(nfr.getId())).thenReturn(Optional.of(nfr));

        assertThat(service.updateStatus(nfr.getId(), StoryStatus.DONE, false).status())
                .isEqualTo(StoryStatus.DONE);
    }
}
