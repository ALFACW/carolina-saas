-- Agregar modo de operación de caja al tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS modo_caja VARCHAR(20) NOT NULL DEFAULT 'simple';
-- simple = dueño solo, multicaja = múltiples cajas y cajeros

-- El campo rol en users ya es VARCHAR, simplemente documentamos los nuevos valores:
-- 'admin', 'supervisor', 'cajero', 'vendedor', 'inventario'
-- (vendedor es alias de cajero por compatibilidad)

-- Índice para búsquedas por modo_caja
CREATE INDEX IF NOT EXISTS idx_tenants_modo_caja ON tenants(modo_caja);
