-- V20: Épicas como entidad de primera clase + trazabilidad Épica → Historia → Task + proceso de QA

-- ── Épicas ────────────────────────────────────────────────────────────────────
CREATE TABLE epics (
    id               UUID         PRIMARY KEY,
    code             VARCHAR(20)  NOT NULL UNIQUE,
    name             VARCHAR(150) NOT NULL,
    objective        TEXT,
    success_criteria TEXT,
    module           VARCHAR(50),
    priority         VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    status           VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);

ALTER TABLE user_stories ADD COLUMN epic_id UUID REFERENCES epics(id);
CREATE INDEX idx_user_stories_epic ON user_stories(epic_id) WHERE deleted_at IS NULL;

-- Migrar épicas existentes (texto libre en user_stories.epic) a entidades reales
INSERT INTO epics (id, code, name, status)
SELECT gen_random_uuid(),
       'EP-' || LPAD((ROW_NUMBER() OVER (ORDER BY MIN(created_at)))::TEXT, 2, '0'),
       epic,
       'IN_PROGRESS'
FROM user_stories
WHERE epic IS NOT NULL AND TRIM(epic) <> '' AND deleted_at IS NULL
GROUP BY epic;

UPDATE user_stories s
SET epic_id = e.id
FROM epics e
WHERE s.epic = e.name AND s.deleted_at IS NULL;

-- ── Vínculo formal task → historia (antes solo texto en linked_requirement_id) ─
ALTER TABLE project_tasks ADD COLUMN user_story_id UUID REFERENCES user_stories(id);
CREATE INDEX idx_project_tasks_story ON project_tasks(user_story_id) WHERE deleted_at IS NULL;

UPDATE project_tasks t
SET user_story_id = s.id
FROM user_stories s
WHERE t.linked_requirement_id = s.req_id
  AND s.deleted_at IS NULL
  AND t.deleted_at IS NULL;

-- ── Ejecuciones de prueba QA (historial inmutable: solo INSERT) ────────────────
CREATE TABLE scenario_test_executions (
    id              UUID        PRIMARY KEY,
    user_story_id   UUID        NOT NULL REFERENCES user_stories(id),
    scenario_id     UUID        NOT NULL REFERENCES story_scenarios(id),
    result          VARCHAR(10) NOT NULL,
    executed_by     VARCHAR(20),
    notes           TEXT,
    defect_task_id  UUID        REFERENCES project_tasks(id),
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_test_exec_story    ON scenario_test_executions(user_story_id);
CREATE INDEX idx_test_exec_scenario ON scenario_test_executions(scenario_id);
