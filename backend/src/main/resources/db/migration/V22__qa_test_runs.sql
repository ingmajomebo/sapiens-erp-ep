-- V22: Ciclos de prueba (test runs), snapshot de escenarios y soporte de regresión

-- ── Ciclos de prueba ──────────────────────────────────────────────────────────
CREATE TABLE qa_test_runs (
    id            UUID         PRIMARY KEY,
    code          VARCHAR(20)  NOT NULL,
    name          VARCHAR(150) NOT NULL,
    run_type      VARCHAR(20)  NOT NULL DEFAULT 'FEATURE',
    build_version VARCHAR(50),
    environment   VARCHAR(20),
    status        VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    opened_by     VARCHAR(20),
    closed_at     TIMESTAMPTZ,
    notes         TEXT,
    sprint_id     UUID         REFERENCES sprints(id),
    summary       JSONB,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

-- Código único solo entre runs activos (mismo patrón que epics, V21)
CREATE UNIQUE INDEX uq_qa_test_runs_code_active ON qa_test_runs(code) WHERE deleted_at IS NULL;

-- Alcance planeado del run: escenarios materializados al crearlo
CREATE TABLE qa_test_run_items (
    id          UUID        PRIMARY KEY,
    run_id      UUID        NOT NULL REFERENCES qa_test_runs(id),
    scenario_id UUID        NOT NULL REFERENCES story_scenarios(id),
    story_id    UUID        NOT NULL REFERENCES user_stories(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (run_id, scenario_id)
);

CREATE INDEX idx_run_items_run   ON qa_test_run_items(run_id);
CREATE INDEX idx_run_items_story ON qa_test_run_items(story_id);

-- ── Versionado y clasificación de escenarios ──────────────────────────────────
ALTER TABLE story_scenarios
    ADD COLUMN version   INT     NOT NULL DEFAULT 1,
    ADD COLUMN tags      TEXT[]  NOT NULL DEFAULT '{}',
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Snapshot y contexto de ejecución ──────────────────────────────────────────
ALTER TABLE scenario_test_executions
    ADD COLUMN test_run_id       UUID REFERENCES qa_test_runs(id),
    ADD COLUMN scenario_snapshot JSONB,
    ADD COLUMN build_version     VARCHAR(50),
    ADD COLUMN environment       VARCHAR(20);

-- Backfill: las ejecuciones históricas toman el texto actual del escenario (versión 1)
UPDATE scenario_test_executions e
SET scenario_snapshot = jsonb_build_object(
        'name',            s.scenario_title,
        'givenConditions', s.given_conditions,
        'whenEvent',       s.when_event,
        'thenOutcome',     s.then_outcome,
        'scenarioType',    s.scenario_type,
        'version',         1)
FROM story_scenarios s
WHERE e.scenario_id = s.id;

ALTER TABLE scenario_test_executions ALTER COLUMN scenario_snapshot SET NOT NULL;

CREATE INDEX idx_test_exec_run ON scenario_test_executions(test_run_id);
