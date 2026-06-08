/**
 * Extrae el mensaje de error de una respuesta Axios de forma consistente.
 * Prioridad: error.response.data.error → detalles Zod → mensaje de red → fallback
 */
export function getApiError(err, fallback = 'Ocurrió un error inesperado') {
  // Sin respuesta del servidor (red caída, timeout)
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.'
    if (err?.message?.toLowerCase().includes('network')) return 'Sin conexión con el servidor. Verifica tu internet.'
    return err?.message || fallback
  }

  const data = err.response.data

  // Mensaje principal del backend
  if (data?.error) return data.error

  // Detalles de validación Zod: mostrar el primer campo con error
  if (data?.detalles?.length) {
    return data.detalles.map(d => `${d.campo}: ${d.mensaje}`).join(' · ')
  }

  // Otros formatos de error
  if (data?.message) return data.message
  if (typeof data === 'string') return data

  return fallback
}
