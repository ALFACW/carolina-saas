CREATE TABLE IF NOT EXISTS planes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_plan VARCHAR(50) UNIQUE NOT NULL,
  max_usuarios INTEGER NOT NULL,
  max_cajas INTEGER NOT NULL,
  max_bodegas INTEGER NOT NULL,
  max_ventas_dia INTEGER NOT NULL,
  precio_mensual NUMERIC(15,2) NOT NULL
);
