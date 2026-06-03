const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const { z }   = require('zod');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const tenant  = require('../middleware/tenant');
const logger  = require('../lib/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .xlsx, .xls o .csv'), ok);
  },
});

const filaSchema = z.object({
  nombre:       z.string().min(1, 'Nombre requerido'),
  precio_venta: z.coerce.number().positive('Precio de venta debe ser mayor a 0'),
  codigo:       z.string().optional().nullable(),
  descripcion:  z.string().optional().nullable(),
  categoria:    z.string().optional().nullable(),
  precio_costo: z.coerce.number().min(0).optional().default(0),
  stock_actual: z.coerce.number().int().min(0).optional().default(0),
  stock_minimo: z.coerce.number().int().min(0).optional().default(0),
  bodega:       z.string().optional().default('principal'),
  impuesto_iva: z.coerce.number().min(0).max(100).optional().default(19),
});

// GET /api/importar/productos/template — descarga el archivo de plantilla
router.get('/productos/template', auth, tenant, (req, res) => {
  const wb = XLSX.utils.book_new();
  const headers = [
    ['codigo', 'nombre', 'descripcion', 'categoria', 'precio_venta', 'precio_costo',
     'stock_actual', 'stock_minimo', 'bodega', 'impuesto_iva'],
    ['CAM-001', 'Camiseta Blanca Talla M', 'Camiseta 100% algodón', 'Ropa', 45000, 22000, 50, 10, 'principal', 0],
    ['CAF-001', 'Café Molido 500g', 'Café colombiano', 'Alimentos', 18900, 9500, 30, 5, 'principal', 0],
    ['AUD-001', 'Audífonos Bluetooth', 'Inalámbricos con micrófono', 'Tecnología', 89000, 45000, 15, 3, 'principal', 19],
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);

  // Ancho de columnas
  ws['!cols'] = [8,25,30,15,12,12,12,12,12,12].map(w => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST /api/importar/productos — importa productos desde archivo
router.post('/productos', auth, tenant, upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido (.xlsx, .xls o .csv)' });

    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'El archivo está vacío o no tiene datos' });

    const importados = [];
    const errores    = [];

    for (let i = 0; i < rows.length; i++) {
      const fila = rows[i];
      const numFila = i + 2; // +2 por encabezado y base 1

      // Normalizar nombres de columna (ignorar mayúsculas/espacios)
      const normalizado = {};
      for (const [k, v] of Object.entries(fila)) {
        normalizado[k.trim().toLowerCase().replace(/\s+/g, '_')] = v;
      }

      const parsed = filaSchema.safeParse(normalizado);
      if (!parsed.success) {
        errores.push({ fila: numFila, nombre: normalizado.nombre || '(sin nombre)', error: parsed.error.errors.map(e => e.message).join(', ') });
        continue;
      }

      const d = parsed.data;

      try {
        // Si tiene código, verificar duplicado dentro del mismo tenant
        if (d.codigo) {
          const { rows: dup } = await db.query(
            'SELECT id FROM productos WHERE tenant_id = $1 AND codigo = $2',
            [req.tenant.id, d.codigo]
          );
          if (dup.length) {
            errores.push({ fila: numFila, nombre: d.nombre, error: `Código "${d.codigo}" ya existe — se omitió` });
            continue;
          }
        }

        await db.query(
          `INSERT INTO productos (tenant_id, codigo, nombre, descripcion, categoria, precio_venta, precio_costo, stock_actual, stock_minimo, bodega, impuesto_iva)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [req.tenant.id, d.codigo || null, d.nombre, d.descripcion || null, d.categoria || null,
           d.precio_venta, d.precio_costo, d.stock_actual, d.stock_minimo, d.bodega, d.impuesto_iva]
        );
        importados.push(d.nombre);
      } catch (dbErr) {
        errores.push({ fila: numFila, nombre: d.nombre, error: 'Error al guardar en base de datos' });
      }
    }

    logger.info('Importación de productos', { tenant_id: req.tenant.id, importados: importados.length, errores: errores.length });

    res.json({
      total_filas: rows.length,
      importados: importados.length,
      errores: errores.length,
      detalle_errores: errores,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
