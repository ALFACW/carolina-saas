import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { COP } from '../../lib/format'

const fecha = () => new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })

export function FacturaA4({ venta, tenant, cliente, onImprimir }) {
  const ref = useRef(null)

  const handleImprimir = () => {
    if (onImprimir) { onImprimir(ref.current?.innerHTML); return }
    // Fallback: ventana de impresión del navegador
    const win = window.open('', '_blank', 'width=800,height=1000')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Factura ${venta.numero_factura || ''}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:12px; }
        .empresa-nombre { font-size:18px; font-weight:bold; }
        .factura-num { font-size:20px; font-weight:bold; text-align:right; }
        .datos-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .label { font-size:9px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:0.05em; }
        table { width:100%; border-collapse:collapse; margin-bottom:12px; }
        thead tr { background:#f0f0f0; }
        th { padding:5px 8px; text-align:left; font-size:9px; text-transform:uppercase; border-bottom:1px solid #ccc; }
        td { padding:5px 8px; border-bottom:1px solid #eee; font-size:11px; }
        .text-right { text-align:right; }
        .totales { margin-left:auto; width:200px; }
        .total-row { display:flex; justify-content:space-between; padding:2px 0; }
        .total-final { font-size:14px; font-weight:bold; border-top:2px solid #111; padding-top:6px; margin-top:4px; }
        .cufe { font-size:7px; word-break:break-all; color:#666; margin-top:12px; border-top:1px solid #eee; padding-top:8px; }
        .footer { margin-top:16px; text-align:center; font-size:9px; color:#888; }
        @media print { @page { size: A4; margin: 15mm; } }
      </style></head>
      <body>${ref.current?.innerHTML || ''}</body></html>`)
    win.document.close(); win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const cufeUrl = venta.cufe ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${venta.cufe}` : null

  return (
    <div>
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111', padding: '20px', maxWidth: '720px', margin: '0 auto', background: '#fff' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: '12px', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{tenant?.nombre}</p>
            <p style={{ color: '#555' }}>NIT: {tenant?.nit}</p>
            {tenant?.direccion && <p style={{ color: '#555' }}>{tenant.direccion}{tenant.ciudad ? ` · ${tenant.ciudad}` : ''}</p>}
            {tenant?.telefono && <p style={{ color: '#555' }}>Tel: {tenant.telefono}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Factura de Venta</p>
            <p style={{ fontSize: '22px', fontWeight: 'bold' }}>{venta.numero_factura || 'Demo'}</p>
            <p style={{ color: '#555' }}>{fecha()}</p>
          </div>
        </div>

        {/* Datos cliente y pago */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente</p>
            {cliente ? (
              <>
                <p style={{ fontWeight: 'bold' }}>{cliente.nombre}</p>
                <p style={{ color: '#555' }}>{cliente.tipo_documento}: {cliente.numero_documento}</p>
                {cliente.email && <p style={{ color: '#555' }}>{cliente.email}</p>}
              </>
            ) : (
              <p style={{ color: '#555' }}>Consumidor final</p>
            )}
          </div>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Detalles de pago</p>
            <p><span style={{ color: '#888' }}>Método:</span> <span style={{ textTransform: 'capitalize' }}>{(venta.metodo_pago || 'Efectivo').replace('_', ' ')}</span></p>
            {venta.efectivo_recibido > 0 && <p><span style={{ color: '#888' }}>Recibido:</span> {COP(venta.efectivo_recibido)}</p>}
            {venta.efectivo_recibido > 0 && <p><span style={{ color: '#888' }}>Vuelto:</span> {COP(venta.efectivo_recibido - venta.total)}</p>}
          </div>
        </div>

        {/* Tabla de items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Producto</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Cant.</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Precio unit.</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.items?.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', color: '#888' }}>{i + 1}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>{item.descripcion}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{item.cantidad}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{COP(item.precio_unitario)}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{COP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ width: '200px' }}>
            {[
              { l: 'Subtotal', v: venta.subtotal },
              { l: 'IVA', v: venta.impuesto_total },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
                <span>{l}</span><span>{COP(v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #111', marginTop: '4px' }}>
              <span>TOTAL</span><span>{COP(venta.total)}</span>
            </div>
          </div>
        </div>

        {/* CUFE + QR */}
        {venta.cufe && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {cufeUrl && <QRCodeSVG value={cufeUrl} size={64} />}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>CUFE — Verificar en DIAN</p>
              <p style={{ fontSize: '7px', wordBreak: 'break-all', color: '#666', fontFamily: 'monospace' }}>{venta.cufe}</p>
            </div>
          </div>
        )}

        {/* Pie */}
        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '9px', color: '#aaa' }}>
          Documento equivalente válido ante la DIAN · Generado con Carolina Facturación
        </p>
      </div>

      {/* Botón imprimir */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleImprimir}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-gray-700 transition-colors text-sm"
        >
          <Printer className="w-4 h-4" />Imprimir factura A4
        </button>
      </div>
    </div>
  )
}
