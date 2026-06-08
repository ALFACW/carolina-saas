-- Agregado en sesión junio 2026: logo del tenant + tabla de dispositivos de impresión por dispositivo

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS printer_names TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE users ADD COLUMN IF NOT EXISTS printer_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS printer_names TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS print_devices (
  id         TEXT        PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  printer_names TEXT[]   DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
