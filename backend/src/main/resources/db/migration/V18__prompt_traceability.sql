-- Trazabilidad de ejecución de prompts
ALTER TABLE prompt_plans
    ADD COLUMN effectiveness_rating SMALLINT CHECK (effectiveness_rating BETWEEN 1 AND 5),
    ADD COLUMN execution_notes      TEXT,
    ADD COLUMN executed_at          TIMESTAMPTZ;
