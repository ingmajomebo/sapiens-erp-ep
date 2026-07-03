package com.sapiens.erp.modules.project.application;

import com.sapiens.erp.modules.project.api.dto.QaAttachmentResponse;
import com.sapiens.erp.modules.project.domain.QaExecutionAttachment;
import com.sapiens.erp.modules.project.domain.QaExecutionAttachmentRepository;
import com.sapiens.erp.modules.project.domain.ScenarioTestExecution;
import com.sapiens.erp.modules.project.domain.ScenarioTestExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

/**
 * Evidencia de ejecuciones QA en almacenamiento local configurable (app.uploads.dir).
 * Solo png/jpeg/pdf, máximo 5MB. Los adjuntos son parte del historial inmutable.
 */
@Service
@RequiredArgsConstructor
public class QaAttachmentService {

    private static final Logger log = LoggerFactory.getLogger(QaAttachmentService.class);
    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "application/pdf");

    private final QaExecutionAttachmentRepository attachmentRepository;
    private final ScenarioTestExecutionRepository executionRepository;

    @Value("${app.uploads.dir:uploads/qa}")
    private String uploadsDir;

    @Transactional
    public QaAttachmentResponse store(UUID executionId, MultipartFile file) {
        ScenarioTestExecution execution = executionRepository.findById(executionId)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Ejecución no encontrada: " + executionId));

        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("El archivo supera el máximo de 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Tipo no permitido (solo PNG, JPEG o PDF): " + contentType);
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidencia";
        String safeName = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        UUID id = UUID.randomUUID();

        try {
            Path dir = Paths.get(uploadsDir);
            Files.createDirectories(dir);
            Path target = dir.resolve(id + "_" + safeName);
            file.transferTo(target.toAbsolutePath());
            QaExecutionAttachment attachment = QaExecutionAttachment.create(
                    execution, safeName, contentType, file.getSize(), target.toString());
            attachment.setId(id);
            attachmentRepository.save(attachment);
            log.info("Evidencia QA guardada: {} ({} bytes) para ejecución {}", safeName, file.getSize(), executionId);
            return QaAttachmentResponse.from(attachment);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la evidencia", e);
        }
    }

    @Transactional(readOnly = true)
    public LoadedAttachment load(UUID id) {
        QaExecutionAttachment attachment = attachmentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Adjunto no encontrado: " + id));
        try {
            byte[] content = Files.readAllBytes(Paths.get(attachment.getStoragePath()));
            return new LoadedAttachment(attachment.getFileName(), attachment.getContentType(), content);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer la evidencia " + id, e);
        }
    }

    public record LoadedAttachment(String fileName, String contentType, byte[] content) {}
}
