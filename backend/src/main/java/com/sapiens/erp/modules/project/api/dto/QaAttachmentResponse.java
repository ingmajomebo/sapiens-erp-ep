package com.sapiens.erp.modules.project.api.dto;

import com.sapiens.erp.modules.project.domain.QaExecutionAttachment;

import java.util.UUID;

public record QaAttachmentResponse(
        UUID id,
        String fileName,
        String contentType,
        long sizeBytes
) {
    public static QaAttachmentResponse from(QaExecutionAttachment a) {
        return new QaAttachmentResponse(a.getId(), a.getFileName(), a.getContentType(), a.getSizeBytes());
    }
}
