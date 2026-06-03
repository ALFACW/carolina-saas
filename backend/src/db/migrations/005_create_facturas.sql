CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  vendedor_id UUID REFERENCES users(id),
  alegra_id VARCHAR(100),
  numero_factura VARCHAR(100),
  cufe VARCHAR(500),
  subtotal NUMERIC(15,2) NOT NULL,
  impuesto_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  metodo_pago VARCHAR(50),
  estado VARCHAR(50) DEFAULT 'pendiente',
  pdf_url TEXT,
  xml_url TEXT,
  fecha_emision TIMESTAMPTZ DEFAULT NOW(),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_tenant_id ON facturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(tenant_id, fecha_emision);
