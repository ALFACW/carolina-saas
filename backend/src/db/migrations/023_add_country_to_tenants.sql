-- Agrega soporte multi-país a tenants
-- country: 'CO' = Colombia (default), 'CL' = Chile
-- sii_status: solo Chile — null=no aplica, 'pendiente'=en certificación SII, 'certificado'=listo para producción
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS country CHAR(2) NOT NULL DEFAULT 'CO',
  ADD COLUMN IF NOT EXISTS sii_status VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS simpleapi_key_encrypted TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country);
