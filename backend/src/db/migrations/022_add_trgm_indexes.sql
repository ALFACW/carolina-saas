-- Índices trigram para búsqueda rápida de productos en POS (pg_trgm)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
  ON productos USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_trgm
  ON productos USING gin (codigo gin_trgm_ops);
