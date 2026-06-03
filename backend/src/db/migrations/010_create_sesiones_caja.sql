CREATE TABLE IF NOT EXISTS sesiones_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  caja_id UUID NOT NULL REFERENCES cajas(id),
  cajero_id UUID NOT NULL REFERENCES users(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta',  -- 'abierta' | 'cerrada'
  fondo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_efectivo NUMERIC(15,2) DEFAULT 0,
  total_tarjeta NUMERIC(15,2) DEFAULT 0,
  total_transferencia NUMERIC(15,2) DEFAULT 0,
  total_credito NUMERIC(15,2) DEFAULT 0,
  total_ventas NUMERIC(15,2) DEFAULT 0,
  efectivo_contado NUMERIC(15,2),
  diferencia NUMERIC(15,2),
  notas_cierre TEXT,
  fecha_apertura TIMESTAMPTZ DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ,
  aprobado_por UUID REFERENCES users(id),
  fecha_aprobacion TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sesiones_tenant ON sesiones_caja(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_cajero ON sesiones_caja(cajero_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_caja ON sesiones_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones_caja(tenant_id, estado);
