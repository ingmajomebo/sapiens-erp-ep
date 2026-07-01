-- V15: User stories and Gherkin scenarios for requirements tracking

CREATE TABLE user_stories (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    req_id          VARCHAR(20) NOT NULL UNIQUE,
    epic            VARCHAR(100),
    story_type      VARCHAR(20) NOT NULL DEFAULT 'FUNCTIONAL',
    persona         VARCHAR(150),
    action_statement TEXT,
    outcome_statement TEXT,
    description     TEXT,
    module          VARCHAR(50),
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status          VARCHAR(20) NOT NULL DEFAULT 'DEFINED',
    nfr_category    VARCHAR(50),
    nfr_criterion   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE story_scenarios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_story_id   UUID        NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
    scenario_title  VARCHAR(255) NOT NULL,
    given_conditions TEXT       NOT NULL,
    when_event      TEXT        NOT NULL,
    then_outcome    TEXT        NOT NULL,
    scenario_type   VARCHAR(20) NOT NULL DEFAULT 'HAPPY_PATH',
    sort_order      INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_user_stories_module   ON user_stories(module)        WHERE deleted_at IS NULL;
CREATE INDEX idx_user_stories_type     ON user_stories(story_type)    WHERE deleted_at IS NULL;
CREATE INDEX idx_user_stories_status   ON user_stories(status)        WHERE deleted_at IS NULL;
CREATE INDEX idx_story_scenarios_story ON story_scenarios(user_story_id);
