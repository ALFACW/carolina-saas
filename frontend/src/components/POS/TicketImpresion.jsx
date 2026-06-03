import React, { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, Zap } from 'lucide-react'
import { COP } from '../../lib/format'
import { buildTicket } from '../../lib/escpos'

const formatFecha = () => {
  const d = new Date()
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export function TicketImpresion({ venta, tenant, cliente, qzTray }) {
  const ticketRef = useRef(null)
  const [imprimiendo, setImprimiendo] = useState(false)
  const logo = localStorage.getItem('carolina_logo') || null

  // Imprimir directo via QZ Tray (térmica + gaveta)
  const handleImprimirQZ = async () => {
    setImprimiendo(true)
    try {
      const cmds = buildTicket({ empresa: tenant || {}, venta, cliente })
      await qzTray.imprimirTicket(cmds)
    } catch (err) {
      alert('Error al imprimir: ' + err.message)
    } finally {
      setImprimiendo(false)
    }
  }

  // Imprimir via navegador (fallback)
  const handleImprimirNavegador = () => {
    const contenido = ticketRef.current.innerHTML
    const ventana = window.open('', '_blank', 'width=320,height=600')
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket ${venta.numero_factura || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              width: 72mm;
              padding: 4mm;
              color: #000;
            }
            .centro { text-align: center; }
            .derecha { text-align: right; }
            .negrita { font-weight: bold; }
            .grande { font-size: 13px; }
            .separador { border-top: 1px dashed #000; margin: 4px 0; }
            .fila { display: flex; justify-content: space-between; }
            .item-nombre { flex: 1; padding-right: 4px; }
            .total-linea { display: flex; justify-content: space-between; font-size: 12px; }
            .total-final { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; border-top: 2px solid #000; padding-top: 3px; margin-top: 3px; }
            .cufe { font-size: 7px; word-break: break-all; margin-top: 2px; }
            .qr { text-align: center; margin: 6px 0; }
            .pie { text-align: center; font-size: 10px; margin-top: 6px; }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print(); ventana.close() }, 300)
  }

  const cufeUrl = venta.cufe
    ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${venta.cufe}`
    : null

  return (
    <div>
      {/* Vista previa del ticket en pantalla */}
      <div
        ref={ticketRef}
        className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-xs"
        style={{ width: '280px', margin: '0 auto' }}
      >
        {/* Logo si existe */}
        {logo && (
          <div className="text-center mb-2">
            <img src={logo} alt="Logo" style={{ maxHeight: '60px', maxWidth: '200px', margin: '0 auto', display: 'block' }} />
          </div>
        )}

        {/* Encabezado empresa */}
        <div className="text-center mb-2">
          <p className="font-bold text-sm">{tenant?.nombre || 'Mi Empresa'}</p>
          <p>NIT: {tenant?.nit || '000.000.000-0'}</p>
          {tenant?.direccion && <p>{tenant.direccion}</p>}
          {tenant?.ciudad && <p>{tenant.ciudad}</p>}
          {tenant?.telefono && <p>Tel: {tenant.telefono}</p>}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Datos factura */}
        <div className="mb-2 space-y-0.5">
          <div className="flex justify-between">
            <span className="font-bold">Factura:</span>
            <span className="font-bold">{venta.numero_factura || 'Sin número'}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatFecha()}</span>
          </div>
          {cliente && (
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span className="text-right max-w-[140px] truncate">{cliente.nombre}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Pago:</span>
            <span className="capitalize">{venta.metodo_pago?.replace('_', ' ') || 'Efectivo'}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Items */}
        <div className="mb-2 space-y-1">
          {venta.items?.map((item, i) => (
            <div key={i}>
              <p className="font-medium leading-tight">{item.descripcion}</p>
              <div className="flex justify-between text-gray-600">
                <span>{item.cantidad} x {COP(item.precio_unitario)}</span>
                <span className="font-medium text-black">{COP(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Totales */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{COP(venta.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA:</span>
            <span>{COP(venta.impuesto_total)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{COP(venta.total)}</span>
          </div>
          {venta.efectivo_recibido > 0 && (
            <>
              <div className="flex justify-between">
                <span>Recibido:</span>
                <span>{COP(venta.efectivo_recibido)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Vuelto:</span>
                <span>{COP(venta.efectivo_recibido - venta.total)}</span>
              </div>
            </>
          )}
        </div>

        {/* QR y CUFE */}
        {cufeUrl && (
          <>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <div className="text-center">
              <QRCodeSVG value={cufeUrl} size={80} className="mx-auto mb-1" />
              <p className="text-xs text-gray-500 mb-0.5">Verificar en DIAN:</p>
              <p style={{ fontSize: '7px', wordBreak: 'break-all', color: '#666' }}>
                {venta.cufe?.substring(0, 40)}...
              </p>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-center space-y-0.5">
          <p className="font-bold">¡Gracias por su compra!</p>
          <p className="text-gray-500" style={{ fontSize: '10px' }}>Documento válido ante la DIAN</p>
          <p className="text-gray-500" style={{ fontSize: '10px' }}>Conserve este comprobante</p>
        </div>
      </div>

      {/* Botones imprimir */}
      <div className="flex gap-2 mt-4 justify-center">
        {/* QZ Tray — impresión directa + gaveta */}
        {qzTray?.conectado && qzTray?.impTermica ? (
          <button
            onClick={handleImprimirQZ}
            disabled={imprimiendo}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {imprimiendo ? 'Imprimiendo...' : 'Imprimir + abrir gaveta'}
          </button>
        ) : (
          <button
            onClick={handleImprimirNavegador}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-gray-700 transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir ticket
          </button>
        )}
      </div>

      {/* Aviso si QZ Tray no está instalado */}
      {(!qzTray?.conectado) && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Instala <a href="https://qz.io" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">QZ Tray</a> para impresión directa y apertura automática del cajón
        </p>
      )}
    </div>
  )
}
