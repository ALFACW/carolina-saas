-- Certificado digital PFX y datos resolución SII para tenants chilenos
--
-- cert_pfx_encrypted:          PFX convertido a base64, luego cifrado con AES-256-GCM
--                               (encrypt(buffer.toString('base64')) via lib/crypto.js)
-- cert_pfx_password_encrypted: contraseña del PFX, cifrada igual
-- sii_numero_resolucion:       número de resolución SII (0 en certificación)
-- sii_fecha_resolucion:        fecha resolución SII — requerida en PDFs y envío al SII
-- sii_unidad:                  unidad SII emisora (ej: 'SANTIAGO', 'IQUIQUE', 'ALTO HOSPICIO')
--
-- Requisito: variable de entorno ENCRYPTION_KEY (32 bytes en hex, 64 chars)
-- Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cert_pfx_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cert_pfx_password_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sii_numero_resolucion INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sii_fecha_resolucion DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sii_unidad VARCHAR(50) DEFAULT NULL;
