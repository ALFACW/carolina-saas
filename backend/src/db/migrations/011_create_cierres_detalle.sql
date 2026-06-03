-- Detalle de denominaciones en el cierre (billetes contados)
CREATE TABLE IF NOT EXISTS cierres_denominaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id UUID NOT NULL REFERENCES sesiones_caja(id) ON DELETE CASCADE,
  denominacion INTEGER NOT NULL,  -- valor del billete/moneda
  cantidad INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS (denominacion * cantidad) STORED
);
CREATE INDEX IF NOT EXISTS idx_cierres_sesion ON cierres_denominaciones(sesion_id);
