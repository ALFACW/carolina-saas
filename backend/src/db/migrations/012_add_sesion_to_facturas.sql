ALTER TABLE facturas ADD COLUMN IF NOT EXISTS sesion_id UUID REFERENCES sesiones_caja(id);
CREATE INDEX IF NOT EXISTS idx_facturas_sesion ON facturas(sesion_id);
