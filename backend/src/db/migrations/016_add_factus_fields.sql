-- Campos Factus por tenant (rango de numeración DIAN del cliente)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS factus_numbering_range_id INTEGER,
  ADD COLUMN IF NOT EXISTS factus_prefix VARCHAR(10),
  ADD COLUMN IF NOT EXISTS factus_conectado BOOLEAN DEFAULT FALSE;
