-- Pagos recibidos contra facturas a crédito
CREATE TABLE IF NOT EXISTS pagos_cartera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES facturas(id),
  cliente_id UUID REFERENCES clientes(id),
  monto NUMERIC(15,2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  notas TEXT,
  registrado_por UUID REFERENCES users(id),
  fecha_pago TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_tenant ON pagos_cartera(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagos_factura ON pagos_cartera(factura_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos_cartera(cliente_id);

-- Agregar campos de cartera a facturas
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS es_credito BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(15,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_facturas_credito ON facturas(tenant_id, es_credito, estado);
