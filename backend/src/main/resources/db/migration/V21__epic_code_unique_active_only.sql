-- V21: El código de épica debe ser único solo entre épicas activas.
-- Con el UNIQUE global, una épica soft-deleted bloqueaba la reutilización de su código
-- y rompía la autogeneración de EP-NN.
ALTER TABLE epics DROP CONSTRAINT epics_code_key;
CREATE UNIQUE INDEX uq_epics_code_active ON epics(code) WHERE deleted_at IS NULL;
