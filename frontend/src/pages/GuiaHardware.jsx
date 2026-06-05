import React, { useState } from 'react'
import { CheckCircle2, Download, Printer, Zap, Monitor, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const Step = ({ num, title, children, done }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white'}`}>
          {done ? <CheckCircle2 className="w-4 h-4" /> : num}
        </div>
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  )
}

const Tip = ({ children }) => (
  <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3 text-sm text-amber-800">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
)

const Ok = ({ children }) => (
  <div className="flex gap-2 bg-green-50 border border-green-100 rounded-lg p-3 mt-3 text-sm text-green-800">
    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
)

export default function GuiaHardware() {
  return (
    <div className="max-w-2xl mx-auto space-y-3">

      {/* Header */}
      <div className="bg-gray-900 text-white rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Printer className="w-6 h-6" />
          <h1 className="text-xl font-bold">Guia de configuracion de hardware</h1>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Sigue estos pasos para conectar tu impresora termica, gaveta de dinero
          y pistola lectora de codigos con CarolinaPOS.
        </p>
      </div>

      {/* Requisitos */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Antes de empezar necesitas:</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            'Computador con Windows 10 u 11',
            'Navegador Google Chrome o Microsoft Edge',
            'Impresora termica USB (ej. 3nstar, Epson TM, Star)',
            'Gaveta de dinero conectada a la impresora (RJ11)',
            'Pistola lectora de codigos USB (opcional)',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Pasos */}
      <Step num="1" title="Descarga e instala QZ Tray">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <p>
            QZ Tray es un programa gratuito que permite que CarolinaPOS se comunique
            directamente con tu impresora y gaveta.
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Entra a <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">qz.io</span> desde tu navegador</li>
            <li>Haz clic en <strong>"Download"</strong> y descarga la version para Windows</li>
            <li>Ejecuta el instalador (<code className="text-xs bg-gray-100 px-1 rounded">.exe</code>) y sigue los pasos</li>
            <li>Al terminar QZ Tray se inicia automaticamente en segundo plano</li>
          </ol>
          <Ok>Sabes que esta corriendo cuando ves el icono <strong>QZ</strong> en la barra de tareas (esquina inferior derecha).</Ok>
          <Tip>Si Windows muestra una advertencia de "publicador desconocido", haz clic en "Mas informacion" y luego "Ejecutar de todas formas". Es seguro.</Tip>
        </div>
      </Step>

      <Step num="2" title="Conecta la impresora y la gaveta">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <p>Conecta los dispositivos en este orden:</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Conecta el cable USB de la impresora al computador</li>
            <li>Conecta la gaveta a la impresora con el cable RJ11 (como un cable de telefono)</li>
            <li>Enciende la impresora</li>
            <li>Windows instalara los drivers automaticamente (espera 1 minuto)</li>
          </ol>
          <Ok>La impresora aparece en <strong>Inicio → Configuracion → Bluetooth y dispositivos → Impresoras</strong> cuando esta bien instalada.</Ok>
          <Tip>La gaveta NO necesita cable USB propio. Se controla a traves de la impresora.</Tip>
        </div>
      </Step>

      <Step num="3" title="Configura CarolinaPOS">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Abre CarolinaPOS en Chrome o Edge</li>
            <li>Ve a <strong>Configuracion → Hardware de caja</strong></li>
            <li>Haz clic en <strong>"Conectar QZ Tray"</strong></li>
            <li>Aparecera un popup preguntando si permites la conexion — haz clic en <strong>"Permitir"</strong> y marca <strong>"Recordar esta decision"</strong></li>
            <li>Selecciona tu impresora en la lista</li>
            <li>Elige el ancho del papel (58mm o 80mm)</li>
            <li>Haz clic en <strong>"Imprimir pagina de prueba"</strong></li>
          </ol>
          <Ok>Si sale el ticket de prueba, todo esta correctamente configurado.</Ok>
        </div>
      </Step>

      <Step num="4" title="Configura la pistola lectora (escaner)">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Conecta la pistola al puerto USB del computador</li>
            <li>Windows la reconoce automaticamente (funciona como teclado)</li>
            <li>Abre el Punto de Venta en CarolinaPOS</li>
            <li>Haz clic en el campo de busqueda de productos</li>
            <li>Escanea cualquier producto — debe aparecer en pantalla automaticamente</li>
          </ol>
          <Ok>El escaner funciona en cualquier campo de texto. No necesita configuracion adicional.</Ok>
          <Tip>Si el escaner no encuentra el producto, verifica que el codigo de barras este registrado en el modulo de Productos.</Tip>
        </div>
      </Step>

      <Step num="5" title="Instala el certificado de CarolinaPOS (elimina el popup)">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <p>
            Sin este paso QZ Tray pedira permiso cada vez que abras CarolinaPOS.
            Instalar el certificado lo elimina para siempre.
          </p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>
              Descarga el certificado haciendo clic aqui:{' '}
              <a
                href="/api/qz/certificate"
                download="carolinapos-qz.pem"
                className="text-gray-900 font-semibold underline"
              >
                Descargar carolinapos-qz.pem
              </a>
            </li>
            <li>Abre el Explorador de archivos de Windows</li>
            <li>
              Navega a:{' '}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                C:\Users\TU_USUARIO\AppData\Roaming\qz
              </code>
            </li>
            <li>Copia el archivo <strong>carolinapos-qz.pem</strong> dentro de esa carpeta</li>
            <li>Reinicia QZ Tray (clic derecho en el icono → Exit, luego abrelo de nuevo)</li>
          </ol>
          <Ok>Desde ahora CarolinaPOS se conecta automaticamente sin ningun popup.</Ok>
          <Tip>
            La carpeta AppData esta oculta. Para verla: en el Explorador escribe{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">%APPDATA%\qz</code>{' '}
            en la barra de direcciones y presiona Enter.
          </Tip>
        </div>
      </Step>

      <Step num="6" title="Configura inicio automatico de QZ Tray">
        <div className="space-y-3 mt-3 text-sm text-gray-600">
          <p>Para que QZ Tray arranque solo al encender el computador:</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Haz clic derecho en el icono de QZ Tray en la barra de tareas</li>
            <li>Selecciona <strong>"Auto start"</strong> o <strong>"Start automatically"</strong></li>
            <li>Marca la opcion para que inicie con Windows</li>
          </ol>
          <Ok>Asi no tendras que abrir QZ Tray manualmente cada vez que enciendes el computador.</Ok>
        </div>
      </Step>

      {/* Problemas comunes */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Solución de problemas comunes</h2>
        <div className="space-y-4 text-sm">
          {[
            {
              p: 'CarolinaPOS dice "QZ Tray desconectado"',
              s: 'Verifica que el icono de QZ Tray aparece en la barra de tareas. Si no, abre QZ Tray manualmente desde el menu de inicio.',
            },
            {
              p: 'No aparece mi impresora en la lista',
              s: 'Asegurate de que la impresora esta encendida y conectada. Luego haz clic en "Reconectar" en Configuracion → Hardware.',
            },
            {
              p: 'El ticket sale cortado o con caracteres extraños',
              s: 'Verifica que el ancho de papel configurado (58mm o 80mm) coincide con el papel que usa tu impresora.',
            },
            {
              p: 'La gaveta no se abre',
              s: 'La gaveta se abre automaticamente al cobrar una venta. Verifica que el cable RJ11 esta bien conectado entre gaveta e impresora.',
            },
            {
              p: 'El escaner no hace nada al escanear',
              s: 'Asegurate de que el cursor este dentro del campo de busqueda de productos antes de escanear.',
            },
          ].map((item, i) => (
            <div key={i} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <p className="font-medium text-gray-900 mb-1">❌ {item.p}</p>
              <p className="text-gray-500">✅ {item.s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Soporte */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
        <p className="text-sm text-gray-500">
          ¿Necesitas ayuda? Escribenos a{' '}
          <span className="font-medium text-gray-900">soporte@carolinapos.co</span>
          {' '}o al WhatsApp de soporte.
        </p>
      </div>

    </div>
  )
}
