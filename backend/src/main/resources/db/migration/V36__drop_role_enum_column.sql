-- Make role_id mandatory now that all users have been migrated
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

-- Drop the superseded enum column
ALTER TABLE users DROP COLUMN role;
