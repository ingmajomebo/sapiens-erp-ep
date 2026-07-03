-- V25: Evidencia adjunta de ejecuciones QA (parte del historial inmutable: solo INSERT)
CREATE TABLE qa_execution_attachments (
    id           UUID         PRIMARY KEY,
    execution_id UUID         NOT NULL REFERENCES scenario_test_executions(id),
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes   BIGINT       NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_qa_attachments_execution ON qa_execution_attachments(execution_id);
