-- Modo turnos en tenant + campos de cambio de turno en sesiones
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS modo_turnos BOOLEAN DEFAULT FALSE;

ALTER TABLE sesiones_caja
  ADD COLUMN IF NOT EXISTS tipo_cierre   VARCHAR(20)     DEFAULT 'cierre_final',
  ADD COLUMN IF NOT EXISTS fondo_siguiente NUMERIC(15,2) DEFAULT 0;
