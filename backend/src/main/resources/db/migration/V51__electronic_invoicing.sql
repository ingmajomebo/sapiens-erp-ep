-- Facturación electrónica: el rastro de cada factura ante la DIAN.
--
-- Vive en su propia tabla y no como columnas de `sales_invoices` por dos
-- razones. La primera es que el envío puede reintentarse: hace falta guardar
-- intentos, último error y fecha de cada cosa, y eso ensuciaría la factura con
-- media docena de columnas que solo interesan a la integración. La segunda es
-- que el proveedor es intercambiable; si mañana se cambia MATIAS por otro, lo
-- que se rehace es esta tabla, no la factura.
--
-- La relación es 1:1 con la factura: se guarda el ESTADO ACTUAL del documento,
-- no un histórico de intentos. El histórico ya existe en `sales_invoice_history`.

CREATE TABLE electronic_invoice_documents (
    id                  UUID PRIMARY KEY,
    invoice_id          UUID          NOT NULL UNIQUE
                                      REFERENCES sales_invoices(id),

    -- Qué proveedor produjo este documento. Se guarda aunque solo haya uno
    -- configurado: al cambiar de proveedor hay que poder distinguir lo emitido
    -- con el anterior, porque el CUFE y las urls siguen siendo suyos.
    provider            VARCHAR(30)   NOT NULL,
    environment         VARCHAR(20)   NOT NULL,

    status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',

    -- Numeración fiscal EFECTIVAMENTE enviada. Se copia aquí en vez de leerse
    -- de la configuración al mostrar: la resolución cambia con el tiempo y una
    -- factura de hace un año debe seguir mostrando la suya.
    resolution_number   VARCHAR(50),
    prefix              VARCHAR(10),
    document_number     VARCHAR(30),

    -- Identificador único del documento ante la DIAN (CUFE en facturas).
    cufe                VARCHAR(200),
    qr_url              TEXT,
    pdf_url             TEXT,
    xml_url             TEXT,

    -- Código y descripción tal como los devuelve la DIAN: "00" aceptado,
    -- "99" con errores. Se guardan crudos para poder rastrear un rechazo.
    dian_status_code    VARCHAR(10),
    dian_message        TEXT,
    last_error          TEXT,

    attempts            INTEGER       NOT NULL DEFAULT 0,
    submitted_at        TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT ck_eid_status CHECK (status IN (
        'PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED')),
    CONSTRAINT ck_eid_attempts CHECK (attempts >= 0),

    -- Una factura aceptada sin CUFE no existe: el CUFE ES la aceptación.
    -- Sin esta regla, un error de mapeo podría dejar facturas "aceptadas"
    -- que ante la DIAN nunca se radicaron.
    CONSTRAINT ck_eid_accepted_has_cufe
        CHECK (status <> 'ACCEPTED' OR cufe IS NOT NULL)
);

-- Buscar los documentos que hay que reintentar es la consulta más frecuente
-- del módulo, y siempre pregunta por el estado.
CREATE INDEX idx_eid_status ON electronic_invoice_documents (status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_eid_invoice ON electronic_invoice_documents (invoice_id);

COMMENT ON TABLE electronic_invoice_documents IS
    'Estado de cada factura de venta ante la DIAN, a través del proveedor configurado.';
COMMENT ON COLUMN electronic_invoice_documents.status IS
    'PENDING: emitida, aún no enviada. SUBMITTED: enviada, sin veredicto. '
    'ACCEPTED: la DIAN la validó. REJECTED: la DIAN la rechazó (error de datos). '
    'FAILED: no se pudo enviar (red, credenciales); se puede reintentar.';
