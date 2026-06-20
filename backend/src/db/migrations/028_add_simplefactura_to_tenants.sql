-- Reemplaza columnas SimpleAPI por SimpleFactura (Bearer token)
-- SimpleFactura no requiere PFX ni CAF por request — los gestiona en su portal

-- Token Bearer de SimpleFactura (cifrado AES-256-GCM)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS simplefactura_token_encrypted TEXT;

-- Sucursal configurada en SimpleFactura (ej: "Casa Matriz")
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS simplefactura_sucursal VARCHAR(100) DEFAULT 'Casa Matriz';

-- Ambiente: 0=certificación, 1=producción
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS simplefactura_ambiente SMALLINT DEFAULT 0;
