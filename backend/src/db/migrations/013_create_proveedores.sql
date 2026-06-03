CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  nit VARCHAR(30),
  email VARCHAR(255),
  telefono VARCHAR(30),
  direccion TEXT,
  ciudad VARCHAR(100),
  contacto VARCHAR(255),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_tenant ON proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(tenant_id, nombre);
