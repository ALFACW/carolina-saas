-- Código interno corto opcional por producto (ej: 10, 345)
-- Números 1, 2, 3 están reservados como atajos del sistema POS
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(50);

-- Único por tenant (no global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_interno_tenant
  ON productos (tenant_id, codigo_interno)
  WHERE codigo_interno IS NOT NULL;
