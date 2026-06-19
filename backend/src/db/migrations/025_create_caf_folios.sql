-- Gestión de folios CAF por tenant y tipo de DTE (solo Chile)
-- El sistema solicita nuevos CAF cuando folios_restantes < umbral_alerta
CREATE TABLE IF NOT EXISTS caf_folios (
  id                SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_dte          SMALLINT NOT NULL,    -- 33, 39, 61, etc.
  folio_desde       INTEGER NOT NULL,
  folio_hasta       INTEGER NOT NULL,
  folio_actual      INTEGER NOT NULL,     -- próximo folio a usar
  caf_xml           TEXT NOT NULL,        -- archivo CAF devuelto por SimpleAPI Folios
  fecha_autorizacion DATE NOT NULL,
  agotado           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, tipo_dte, folio_desde)
);

CREATE INDEX IF NOT EXISTS idx_caf_tenant_tipo ON caf_folios(tenant_id, tipo_dte, agotado);
