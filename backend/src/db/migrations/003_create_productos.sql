CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(100),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  precio_venta NUMERIC(15,2) NOT NULL,
  precio_costo NUMERIC(15,2) DEFAULT 0,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  bodega VARCHAR(100) DEFAULT 'principal',
  impuesto_iva NUMERIC(5,2) DEFAULT 19.00,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_productos_tenant_id ON productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(tenant_id, codigo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(tenant_id, nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(tenant_id, categoria);
