-- V24: req_id único solo entre historias activas (mismo defecto soft-delete vs UNIQUE que V21 en épicas)
ALTER TABLE user_stories DROP CONSTRAINT user_stories_req_id_key;
CREATE UNIQUE INDEX uq_user_stories_reqid_active ON user_stories(req_id) WHERE deleted_at IS NULL;
