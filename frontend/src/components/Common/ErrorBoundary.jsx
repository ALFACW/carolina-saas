import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-surface-soft p-6">
        <div className="card max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="text-danger" size={28} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Algo salió mal</h2>
          <p className="text-sm text-ink-2 mb-6 leading-relaxed">
            Ocurrió un error inesperado en la aplicación. Si el problema persiste, recarga la página.
          </p>
          {this.state.error && (
            <details className="mb-5 text-left">
              <summary className="text-xs text-ink-2 cursor-pointer select-none">Ver detalle técnico</summary>
              <pre className="mt-2 text-xs text-danger bg-red-50 rounded-lg p-3 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg font-semibold text-sm"
          >
            <RefreshCw size={15} />
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}
