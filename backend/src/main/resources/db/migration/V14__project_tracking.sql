-- Módulo de ejecución de proyecto: sprints, tareas y planificador de prompts

CREATE TABLE sprints (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE project_tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(20) NOT NULL DEFAULT 'DEV',
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    assignee VARCHAR(20),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    sprint_id UUID REFERENCES sprints(id),
    module VARCHAR(50),
    linked_requirement_id VARCHAR(20),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE prompt_plans (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    objective TEXT,
    context_info TEXT,
    prompt_content TEXT NOT NULL,
    module VARCHAR(50),
    category VARCHAR(30) NOT NULL DEFAULT 'NEW_FEATURE',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    linked_task_id UUID REFERENCES project_tasks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

INSERT INTO sprints (id, name, goal, start_date, end_date, status)
VALUES (gen_random_uuid(),
        'Sprint 1 — Fundación',
        'Completar el flujo de compras, inventario y finanzas básico',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '14 days',
        'ACTIVE');
