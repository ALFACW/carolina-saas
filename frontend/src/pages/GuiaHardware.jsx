import React, { useState } from 'react'
import { CheckCircle2, Download, Printer, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const Step = ({ num, title, children, done }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-surface-soft transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-green-50 text-success border border-green-200' : 'bg-accent text-white'
        }`}>
          {done ? <CheckCircle2 className="w-4 h-4" /> : num}
        </div>
        <span className="font-semibold text-ink flex-1">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-ink-2" />
          : <ChevronDown className="w-4 h-4 text-ink-2" />
        }
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

const Tip = ({ children }) => (
  <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-sm text-warning">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
)

const Ok = ({ children }) => (
  <div className="flex gap-3 bg-green-50 border border-green-200 rounded-lg p-3 mt-3 text-sm text-success">
    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
)

const Code = ({ children }) => (
  <code className="text-xs bg-gray-900 text-gray-100 px-2 py-0.5 rounded font-mono">{children}</code>
)

export default function GuiaHardware() {
  return (
    <div className="min-h-screen bg-surface-soft p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">Guía de configuración de hardware</h1>
              <p className="text-sm text-ink-2 mt-0.5">Impresora térmica, gaveta y pistola lectora</p>
            </div>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">
            Sigue estos pasos para conectar tu impresora térmica, gaveta de dinero
            y pistola lectora de códigos con CarolinaPOS.
          </p>
        </div>

        {/* Requisitos */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h2 className="font-semibold text-ink mb-3">Antes de empezar necesitas:</h2>
          <ul className="space-y-2.5 text-sm text-ink-2">
            {[
              'Computador con Windows 10 u 11',
              'Navegador Google Chrome o Microsoft Edge',
              'Impresora térmica USB (ej. 3nstar, Epson TM, Star)',
              'Gaveta de dinero conectada a la impresora (RJ11)',
              'Pistola lectora de códigos USB (opcional)',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Pasos */}
        <Step num="1" title="Descarga e inicia el servidor de impresión">
          <div className="space-y-3 mt-3 text-sm text-ink-2">
            <p>
              El ZIP se descarga <strong className="text-ink">desde este navegador y en este equipo</strong> — trae un token único para este dispositivo. Repite el proceso en cada PC o tablet que use impresora.
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                Descarga el servidor desde{' '}
                <a href="/configuracion" className="text-accent font-semibold underline hover:no-underline">
                  Configuración → Impresora → Descargar ZIP
                </a>
                {' '}— el <Code>config.json</Code> ya viene configurado para este equipo
              </li>
              <li>
                <strong className="text-ink">Extrae el ZIP</strong> en una carpeta fija (clic derecho → Extraer aquí), por ejemplo{' '}
                <Code>Documentos\CarolinaPOS\</Code>
              </li>
              <li>
                Haz <strong className="text-ink">doble clic</strong> en <Code>Iniciar.bat</Code>
              </li>
              <li>Instala Python y sus componentes automáticamente (tarda ~2 minutos)</li>
              <li>Cuando aparezca <Code>Esperando trabajos de impresión...</Code> ya está listo</li>
              <li>Deja la ventana abierta — es el servidor corriendo en segundo plano</li>
            </ol>
            <Ok>
              Una vez configurado, cualquier usuario que inicie sesión en este equipo usará la misma impresora sin necesidad de volver a descargar nada.
            </Ok>
            <Tip>
              Para que inicie automáticamente con Windows: crea un acceso directo a <Code>Iniciar.bat</Code>
              y cópialo a la carpeta <Code>%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup</Code>
            </Tip>
          </div>
        </Step>

        <Step num="2" title="Conecta la impresora y la gaveta">
          <div className="space-y-3 mt-3 text-sm text-ink-2">
            <p>Conecta los dispositivos en este orden:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Conecta el cable USB de la impresora al computador</li>
              <li>Conecta la gaveta a la impresora con el cable RJ11 (como un cable de teléfono)</li>
              <li>Enciende la impresora</li>
              <li>Windows instalará los drivers automáticamente (espera 1 minuto)</li>
            </ol>
            <Ok>La impresora aparece en <strong>Inicio → Configuración → Bluetooth y dispositivos → Impresoras</strong> cuando está bien instalada.</Ok>
            <Tip>La gaveta NO necesita cable USB propio. Se controla a través de la impresora.</Tip>
          </div>
        </Step>

        <Step num="3" title="Configura CarolinaPOS">
          <div className="space-y-3 mt-3 text-sm text-ink-2">
            <ol className="space-y-2 list-decimal list-inside">
              <li>Abre CarolinaPOS en Chrome o Edge</li>
              <li>Ve a <strong className="text-ink">Configuración → Hardware de caja</strong></li>
              <li>El estado debe mostrar <strong className="text-ink">Servidor activo</strong> en verde</li>
              <li>En el desplegable selecciona tu impresora térmica</li>
              <li>Elige el ancho del papel (58mm o 80mm)</li>
              <li>Haz clic en <strong className="text-ink">"Prueba"</strong> para imprimir un ticket de prueba</li>
            </ol>
            <Ok>Si sale el ticket de prueba, todo está correctamente configurado.</Ok>
            <Tip>
              Si el estado muestra "Sin servidor", vuelve al Paso 1 y ejecuta <Code>instalar.bat</Code> de nuevo.
            </Tip>
          </div>
        </Step>

        <Step num="4" title="Configura la pistola lectora (escáner)">
          <div className="space-y-3 mt-3 text-sm text-ink-2">
            <ol className="space-y-2 list-decimal list-inside">
              <li>Conecta la pistola al puerto USB del computador</li>
              <li>Windows la reconoce automáticamente (funciona como teclado)</li>
              <li>Abre el Punto de Venta en CarolinaPOS</li>
              <li>Haz clic en el campo de búsqueda de productos</li>
              <li>Escanea cualquier producto — debe aparecer en pantalla automáticamente</li>
            </ol>
            <Ok>El escáner funciona en cualquier campo de texto. No necesita configuración adicional.</Ok>
            <Tip>Si el escáner no encuentra el producto, verifica que el código de barras esté registrado en el módulo de Productos.</Tip>
          </div>
        </Step>

        {/* Problemas comunes */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h2 className="font-semibold text-ink mb-5">Solución de problemas comunes</h2>
          <div className="space-y-5 text-sm">
            {[
              {
                p: 'CarolinaPOS dice "Sin servidor"',
                s: 'Ejecuta instalar.bat de nuevo. Si el problema persiste, abre el Administrador de tareas y verifica que "pythonw.exe" esté en la lista de procesos.',
              },
              {
                p: 'No aparece mi impresora en la lista',
                s: 'Asegúrate de que la impresora está encendida y conectada. Luego haz clic en el botón de actualizar (ícono ↻) junto al desplegable.',
              },
              {
                p: 'El ticket sale cortado o con caracteres extraños',
                s: 'Verifica que el ancho de papel configurado (58mm o 80mm) coincide con el papel que usa tu impresora.',
              },
              {
                p: 'La gaveta no se abre',
                s: 'La gaveta se abre automáticamente al cobrar una venta. Verifica que el cable RJ11 está bien conectado entre gaveta e impresora. Prueba cambiando el "Puerto del cable" entre Pin 2 y Pin 5 en Configuración.',
              },
              {
                p: 'El escáner no hace nada al escanear',
                s: 'Asegúrate de que el cursor esté dentro del campo de búsqueda de productos antes de escanear.',
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-ink mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-danger text-xs font-bold flex-shrink-0">!</span>
                  {item.p}
                </p>
                <p className="text-ink-2 ml-7">{item.s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Soporte */}
        <div className="bg-accent-soft border border-accent/20 rounded-xl p-5 text-center">
          <p className="text-sm text-ink-2">
            ¿Necesitas ayuda? Escríbenos a{' '}
            <span className="font-semibold text-accent">soporte@carolinapos.co</span>
            {' '}o al WhatsApp de soporte.
          </p>
        </div>
      </div>
    </div>
  )
}
