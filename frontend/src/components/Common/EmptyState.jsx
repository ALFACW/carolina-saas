import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, FileText, Package, Users, Truck,
  ShoppingBag, BarChart2, Inbox,
} from 'lucide-react'

const PRESETS = {
  facturas:   { icon: FileText,     title: 'Sin facturas aún',        desc: 'Las facturas emitidas aparecerán aquí.' },
  productos:  { icon: Package,      title: 'Sin productos',           desc: 'Agrega tu primer producto para comenzar a vender.' },
  clientes:   { icon: Users,        title: 'Sin clientes registrados',desc: 'Agrega clientes para asociarlos a tus ventas.' },
  compras:    { icon: ShoppingBag,  title: 'Sin compras registradas', desc: 'Las órdenes de compra a proveedores aparecerán aquí.' },
  proveedores:{ icon: Truck,        title: 'Sin proveedores',         desc: 'Agrega proveedores para registrar compras.' },
  ventas:     { icon: ShoppingCart, title: 'Sin ventas registradas',  desc: 'Las ventas del período aparecerán aquí.' },
  reportes:   { icon: BarChart2,    title: 'Sin datos suficientes',   desc: 'Realiza ventas para ver estadísticas aquí.' },
  default:    { icon: Inbox,        title: 'Sin registros',           desc: 'No hay datos para mostrar.' },
}

export default function EmptyState({
  preset,
  icon: IconProp,
  title,
  desc,
  action,   // { label, to } o { label, onClick }
  compact = false,
}) {
  const p = PRESETS[preset] || PRESETS.default
  const Icon  = IconProp || p.icon
  const label = title    || p.title
  const text  = desc     || p.desc

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mb-4">
        <Icon className="text-accent" size={26} />
      </div>
      <p className="text-base font-semibold text-ink mb-1">{label}</p>
      <p className="text-sm text-ink-2 max-w-xs leading-relaxed mb-5">{text}</p>
      {action && (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
