/**
 * bluetoothPrint.js
 * Impresión ESC/POS via Web Bluetooth (Android Chrome).
 * Soporta los servicios GATT más comunes en impresoras térmicas BT.
 */

// Servicios GATT conocidos de impresoras térmicas Bluetooth
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Genérico (Epson, Star, muchos)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter, GOOJPRT, ZJ-58
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serialio BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART (muy común en clones)
]

// Características de escritura correspondientes
const WRITE_CHARS = [
  '000018f1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
]

const CHUNK_SIZE = 512 // BLE max MTU estándar

export function bluetoothDisponible() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

export async function conectarImpresora() {
  if (!bluetoothDisponible()) throw new Error('Web Bluetooth no disponible en este navegador')

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES,
  })

  const server  = await device.gatt.connect()
  const { service, characteristic } = await encontrarCaracteristica(server)

  return { device, server, service, characteristic }
}

async function encontrarCaracteristica(server) {
  for (let i = 0; i < SERVICES.length; i++) {
    try {
      const service = await server.getPrimaryService(SERVICES[i])
      try {
        const characteristic = await service.getCharacteristic(WRITE_CHARS[i])
        if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
          return { service, characteristic }
        }
      } catch {}
      // Si no encontró la char esperada, busca cualquier char escribible en este servicio
      const chars = await service.getCharacteristics()
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return { service, characteristic: c }
        }
      }
    } catch {}
  }
  throw new Error('Impresora no compatible. No se encontró característica de escritura.')
}

export async function imprimirBluetooth(characteristic, bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const useWriteWithoutResponse = !characteristic.properties.write &&
                                   characteristic.properties.writeWithoutResponse

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE)
    if (useWriteWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValueWithResponse(chunk)
    }
    // Pequeña pausa entre chunks para no saturar el buffer
    if (offset + CHUNK_SIZE < data.length) {
      await new Promise(r => setTimeout(r, 20))
    }
  }
}
