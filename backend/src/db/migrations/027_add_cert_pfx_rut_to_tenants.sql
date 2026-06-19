-- RUT del titular del certificado digital PFX (persona física, no empresa)
-- En Chile, el PFX es emitido a una persona (ej. 17096073-4 "Gonzalo Bustamante"),
-- no a la empresa (ej. 76269769-6). SimpleAPI necesita este RUT en el campo
-- Certificado.Rut de cada request, separado del RUT empresa del emisor.
--
-- Ejemplo:
--   tenants.rut_empresa         = '76269769-6'   → va en Emisor.Rut
--   tenants.cert_pfx_rut        = '17096073-4'   → va en Certificado.Rut
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cert_pfx_rut VARCHAR(12) DEFAULT NULL;
