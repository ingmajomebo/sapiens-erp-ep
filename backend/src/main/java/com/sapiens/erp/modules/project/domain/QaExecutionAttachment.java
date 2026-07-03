package com.sapiens.erp.modules.project.domain;

import com.sapiens.erp.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Evidencia adjunta a una ejecución QA. Parte del historial inmutable: nunca se edita ni borra. */
@Entity
@Table(name = "qa_execution_attachments")
@Getter
@Setter
@NoArgsConstructor
public class QaExecutionAttachment extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id", nullable = false)
    private ScenarioTestExecution execution;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    public static QaExecutionAttachment create(ScenarioTestExecution execution, String fileName,
                                               String contentType, long sizeBytes, String storagePath) {
        QaExecutionAttachment a = new QaExecutionAttachment();
        a.id = UUID.randomUUID();
        a.execution = execution;
        a.fileName = fileName;
        a.contentType = contentType;
        a.sizeBytes = sizeBytes;
        a.storagePath = storagePath;
        return a;
    }
}
