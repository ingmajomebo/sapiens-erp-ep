-- V23: Máquina de estados de historias + registro del ejecutor autenticado

-- Estado previo al bloqueo: BLOCKED solo puede volver al estado desde el que se bloqueó
ALTER TABLE user_stories ADD COLUMN previous_status VARCHAR(20);

-- Identidad autenticada (email del principal JWT) que registró la ejecución;
-- executed_by (enum) se mantiene como fallback para compatibilidad
ALTER TABLE scenario_test_executions ADD COLUMN executed_by_principal VARCHAR(150);
