ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Índice para búsqueda rápida por username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
