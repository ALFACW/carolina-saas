CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id),
  numero_factura VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  -- 'borrador' | 'recibida' | 'cancelada'
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  impuesto_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  notas TEXT,
  fecha_compra TIMESTAMPTZ DEFAULT NOW(),
  fecha_recepcion TIMESTAMPTZ,
  recibida_por UUID REFERENCES users(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  descripcion VARCHAR(500) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(15,2) NOT NULL,
  impuesto NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compras_tenant ON compras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_compra_items_compra ON compra_items(compra_id);
