package com.sapiens.erp.modules.project.domain;

public enum ScenarioType {
    HAPPY_PATH,
    NEGATIVE,
    EDGE,
    /** Verificación de un criterio no funcional medible (historias RNF). */
    NFR_CHECK
}
