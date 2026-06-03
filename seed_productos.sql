SET client_encoding = 'UTF8';

INSERT INTO productos (tenant_id, codigo, nombre, descripcion, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, impuesto_iva)
SELECT t.id, 'CAM-001', 'Camiseta Blanca Talla M', 'Camiseta 100% algodón, talla M', 'Ropa', 45000, 22000, 50, 10, 0
FROM tenants t LIMIT 1;

INSERT INTO productos (tenant_id, codigo, nombre, descripcion, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, impuesto_iva)
SELECT t.id, 'CAF-001', 'Café Molido 500g', 'Café colombiano molido, bolsa 500g', 'Alimentos', 18900, 9500, 30, 5, 0
FROM tenants t LIMIT 1;

INSERT INTO productos (tenant_id, codigo, nombre, descripcion, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, impuesto_iva)
SELECT t.id, 'AUD-001', 'Audífonos Bluetooth', 'Audífonos inalámbricos con micrófono', 'Tecnología', 89000, 45000, 15, 3, 19
FROM tenants t LIMIT 1;

SELECT nombre, descripcion FROM productos;
