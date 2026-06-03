CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  nit VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  alegra_user VARCHAR(255),
  alegra_token_encrypted TEXT,
  alegra_conectado BOOLEAN DEFAULT FALSE,
  onboarding_completado BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_nit ON tenants(nit);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_estado ON tenants(estado);
