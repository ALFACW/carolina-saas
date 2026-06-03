CREATE TABLE IF NOT EXISTS factura_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  descripcion VARCHAR(500) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(15,2) NOT NULL,
  descuento NUMERIC(15,2) DEFAULT 0,
  impuesto NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_factura_items_factura_id ON factura_items(factura_id);
CREATE INDEX IF NOT EXISTS idx_factura_items_producto_id ON factura_items(producto_id);
