// Convierte una imagen (base64/URL) a comando ESC/POS GS v 0 (bitmap)
// Compatible con cualquier impresora térmica ESC/POS

export async function logoAEscPos(logoSrc, anchoCars = 48) {
  const maxPx = anchoCars === 32 ? 256 : 384  // 58mm ≈ 256px, 80mm ≈ 384px

  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      // Escalar manteniendo proporción
      const scale  = Math.min(1, maxPx / img.width)
      const wRaw   = Math.floor(img.width * scale)
      const h      = Math.floor(img.height * scale)
      // El ancho en bytes debe ser múltiplo de 8
      const wBytes = Math.ceil(wRaw / 8)
      const w      = wBytes * 8

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      // Fondo blanco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      // Centrar imagen horizontalmente
      ctx.drawImage(img, Math.floor((w - wRaw) / 2), 0, wRaw, h)

      const imageData = ctx.getImageData(0, 0, w, h).data

      // Convertir pixels a bits: pixel oscuro (<128 brillo) → 1 (imprime negro)
      const pixelBytes = []
      for (let y = 0; y < h; y++) {
        for (let xb = 0; xb < wBytes; xb++) {
          let byte = 0
          for (let bit = 0; bit < 8; bit++) {
            const x   = xb * 8 + bit
            const idx  = (y * w + x) * 4
            const r    = imageData[idx]     ?? 255
            const g    = imageData[idx + 1] ?? 255
            const b    = imageData[idx + 2] ?? 255
            const luma = r * 0.299 + g * 0.587 + b * 0.114
            if (luma < 128) byte |= (0x80 >> bit)
          }
          pixelBytes.push(byte)
        }
      }

      // Armar comando GS v 0 (1D 76 30 00 xL xH yL yH datos...)
      const cmd = new Uint8Array([
        0x1D, 0x76, 0x30, 0x00,                      // GS v 0, modo normal
        wBytes & 0xFF, (wBytes >> 8) & 0xFF,           // ancho en bytes (xL xH)
        h & 0xFF,      (h >> 8) & 0xFF,                // alto en líneas (yL yH)
        ...pixelBytes,
      ])

      // Convertir a base64 para enviar a QZ Tray
      let bin = ''
      cmd.forEach(b => { bin += String.fromCharCode(b) })
      resolve(btoa(bin))
    }

    img.onerror = () => resolve(null)  // sin logo si falla la carga
    img.src = logoSrc
  })
}
