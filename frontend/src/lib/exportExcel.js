import * as XLSX from 'xlsx'

// Exporta cualquier array de objetos a Excel
export function exportarExcel(datos, nombreArchivo, nombreHoja = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

// Helpers específicos por módulo
export function exportarFacturas(facturas) {
  const datos = facturas.map(f => ({
    'Número': f.numero_factura || 'Sin número',
    'Fecha': new Date(f.fecha_emision).toLocaleDateString('es-CO'),
    'Cliente': f.cliente_nombre || 'Consumidor final',
    'Subtotal': parseFloat(f.subtotal || 0),
    'IVA': parseFloat(f.impuesto_total || 0),
    'Total': parseFloat(f.total || 0),
    'Método pago': (f.metodo_pago || '').replace(/_/g, ' '),
    'Estado': f.estado,
  }))
  exportarExcel(datos, `Facturas_${new Date().toISOString().split('T')[0]}`, 'Facturas')
}

export function exportarProductos(productos) {
  const datos = productos.map(p => ({
    'Código': p.codigo || '',
    'Nombre': p.nombre,
    'Categoría': p.categoria || '',
    'Precio venta': parseFloat(p.precio_venta || 0),
    'Precio costo': parseFloat(p.precio_costo || 0),
    'Stock actual': p.stock_actual,
    'Stock mínimo': p.stock_minimo,
    'IVA %': parseFloat(p.impuesto_iva || 0),
    'Bodega': p.bodega || 'principal',
    'Activo': p.activo ? 'Sí' : 'No',
  }))
  exportarExcel(datos, `Productos_${new Date().toISOString().split('T')[0]}`, 'Productos')
}

export function exportarClientes(clientes) {
  const datos = clientes.map(c => ({
    'Tipo doc.': c.tipo_documento,
    'Documento': c.numero_documento,
    'Nombre': c.nombre,
    'Email': c.email || '',
    'Teléfono': c.telefono || '',
    'Ciudad': c.ciudad || '',
    'Sincronizado DIAN': c.alegra_id ? 'Sí' : 'No',
  }))
  exportarExcel(datos, `Clientes_${new Date().toISOString().split('T')[0]}`, 'Clientes')
}

export function exportarCartera(facturas) {
  const datos = facturas.map(f => ({
    'Número factura': f.numero_factura || '',
    'Cliente': f.cliente_nombre || '',
    'Documento': f.cliente_documento || '',
    'Teléfono': f.cliente_telefono || '',
    'Fecha': new Date(f.fecha_emision).toLocaleDateString('es-CO'),
    'Vencimiento': f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-CO') : 'Sin vencimiento',
    'Total factura': parseFloat(f.total || 0),
    'Pagado': parseFloat(f.monto_pagado || 0),
    'Saldo pendiente': parseFloat(f.saldo_pendiente || 0),
    'Días vencida': parseInt(f.dias_vencida || 0),
  }))
  exportarExcel(datos, `Cartera_${new Date().toISOString().split('T')[0]}`, 'Cartera')
}

export function exportarVentasDia(ventas, fecha) {
  const datos = ventas.map(v => ({
    'Número': v.numero_factura || '',
    'Cliente': v.cliente_nombre || 'Consumidor final',
    'Método': (v.metodo_pago || '').replace(/_/g, ' '),
    'Total': parseFloat(v.total || 0),
    'Estado': v.estado,
    'Hora': new Date(v.fecha_emision).toLocaleTimeString('es-CO'),
  }))
  exportarExcel(datos, `Ventas_${fecha || new Date().toISOString().split('T')[0]}`, 'Ventas del día')
}
