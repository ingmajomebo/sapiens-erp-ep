package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.SprintRequest;
import com.sapiens.erp.modules.project.api.dto.SprintResponse;
import com.sapiens.erp.modules.project.domain.Sprint;
import com.sapiens.erp.modules.project.domain.SprintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;

    @Transactional(readOnly = true)
    public List<SprintResponse> listAll() {
        return sprintRepository.findAllActive().stream()
                .map(SprintResponse::from)
                .toList();
    }

    @Transactional
    public SprintResponse create(SprintRequest req) {
        Sprint sprint = Sprint.create(req.name(), req.goal(), req.startDate(), req.endDate());
        return SprintResponse.from(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponse activate(UUID id) {
        Sprint sprint = sprintRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + id));
        sprint.activate();
        return SprintResponse.from(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponse complete(UUID id) {
        Sprint sprint = sprintRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + id));
        sprint.complete();
        return SprintResponse.from(sprintRepository.save(sprint));
    }

    @Transactional
    public void delete(UUID id) {
        Sprint sprint = sprintRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Sprint no encontrado: " + id));
        sprint.softDelete();
        sprintRepository.save(sprint);
    }
}
