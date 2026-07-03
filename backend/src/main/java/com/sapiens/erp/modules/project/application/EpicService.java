package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.EpicRequest;
import com.sapiens.erp.modules.project.api.dto.EpicResponse;
import com.sapiens.erp.modules.project.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EpicService {

    private final EpicRepository epicRepository;
    private final UserStoryRepository storyRepository;

    @Transactional(readOnly = true)
    public List<EpicResponse> listAll() {
        Map<UUID, long[]> counts = new HashMap<>();
        for (Object[] row : storyRepository.countStoriesByEpic(StoryStatus.DONE)) {
            counts.put((UUID) row[0], new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        return epicRepository.findAllByDeletedAtIsNullOrderByCodeAsc().stream()
                .map(e -> {
                    long[] c = counts.getOrDefault(e.getId(), new long[]{0, 0});
                    return EpicResponse.from(e, c[0], c[1]);
                })
                .toList();
    }

    @Transactional
    public EpicResponse create(EpicRequest req) {
        String code = (req.code() != null && !req.code().isBlank()) ? req.code().trim() : nextCode();
        if (epicRepository.existsByCodeAndDeletedAtIsNull(code)) {
            throw new IllegalArgumentException("Ya existe una épica con el código " + code);
        }
        Epic epic = Epic.create(code, req.name(), req.objective(),
                req.successCriteria(), req.module(), req.priority());
        if (req.status() != null) epic.setStatus(req.status());
        return EpicResponse.from(epicRepository.save(epic), 0, 0);
    }

    @Transactional
    public EpicResponse update(UUID id, EpicRequest req) {
        Epic epic = epicRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Épica no encontrada: " + id));
        if (req.code() != null && !req.code().isBlank() && !req.code().trim().equals(epic.getCode())) {
            if (epicRepository.existsByCodeAndDeletedAtIsNull(req.code().trim())) {
                throw new IllegalArgumentException("Ya existe una épica con el código " + req.code().trim());
            }
            epic.setCode(req.code().trim());
        }
        epic.setName(req.name());
        epic.setObjective(req.objective());
        epic.setSuccessCriteria(req.successCriteria());
        epic.setModule(req.module());
        epic.setPriority(req.priority() != null ? req.priority() : epic.getPriority());
        if (req.status() != null) epic.setStatus(req.status());
        Epic saved = epicRepository.save(epic);

        long[] c = countFor(id);
        return EpicResponse.from(saved, c[0], c[1]);
    }

    @Transactional
    public EpicResponse updateStatus(UUID id, EpicStatus status) {
        Epic epic = epicRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Épica no encontrada: " + id));
        // Regla laxa: DONE solo se alcanza desde IN_PROGRESS y solo se reabre a IN_PROGRESS
        EpicStatus current = epic.getStatus();
        if (status == EpicStatus.DONE && current != EpicStatus.IN_PROGRESS && current != EpicStatus.DONE) {
            throw new IllegalArgumentException("Transición no permitida: " + current + " → DONE");
        }
        if (current == EpicStatus.DONE && status != EpicStatus.IN_PROGRESS && status != EpicStatus.DONE) {
            throw new IllegalArgumentException("Transición no permitida: DONE → " + status);
        }
        epic.setStatus(status);
        Epic saved = epicRepository.save(epic);
        long[] c = countFor(id);
        return EpicResponse.from(saved, c[0], c[1]);
    }

    @Transactional
    public void delete(UUID id) {
        Epic epic = epicRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Épica no encontrada: " + id));
        // Las historias no se borran: quedan sin épica asignada
        for (UserStory story : storyRepository.findByEpicIdAndDeletedAtIsNull(id)) {
            story.setEpic(null);
            storyRepository.save(story);
        }
        epic.softDelete();
        epicRepository.save(epic);
    }

    private long[] countFor(UUID epicId) {
        for (Object[] row : storyRepository.countStoriesByEpic(StoryStatus.DONE)) {
            if (epicId.equals(row[0])) {
                return new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()};
            }
        }
        return new long[]{0, 0};
    }

    private String nextCode() {
        int n = 1;
        String code;
        do {
            code = String.format("EP-%02d", n++);
        } while (epicRepository.existsByCodeAndDeletedAtIsNull(code));
        return code;
    }
}
