CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alegra_id VARCHAR(100),
  tipo_documento VARCHAR(20) NOT NULL,
  numero_documento VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero_documento)
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(tenant_id, numero_documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(tenant_id, nombre);
