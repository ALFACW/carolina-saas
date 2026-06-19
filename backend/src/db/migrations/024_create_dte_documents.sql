-- DTEs emitidos por tenants chilenos
-- SimpleAPI no almacena los documentos — CarolinaPOS los guarda aquí
CREATE TABLE IF NOT EXISTS dte_documents (
  id           SERIAL PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo_dte     SMALLINT NOT NULL,         -- 33=Factura, 34=FactExenta, 39=Boleta, 52=Guia, 56=NotaDeb, 61=NotaCred
  folio        INTEGER NOT NULL,
  rut_emisor   VARCHAR(12) NOT NULL,      -- RUT del tenant emisor (XX.XXX.XXX-Y)
  rut_receptor VARCHAR(12),               -- null en boletas (39) — no obligatorio
  razon_social_receptor VARCHAR(255),
  monto_neto   INTEGER,
  monto_iva    INTEGER,
  monto_total  INTEGER NOT NULL,
  xml_firmado  TEXT,                      -- XML firmado devuelto por SimpleAPI
  pdf_base64   TEXT,                      -- PDF devuelto por SimpleAPI
  factura_id   INTEGER REFERENCES facturas(id) ON DELETE SET NULL,  -- link a la venta
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, tipo_dte, folio)
);

CREATE INDEX IF NOT EXISTS idx_dte_tenant       ON dte_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dte_factura      ON dte_documents(factura_id);
CREATE INDEX IF NOT EXISTS idx_dte_fecha        ON dte_documents(tenant_id, fecha_emision);
