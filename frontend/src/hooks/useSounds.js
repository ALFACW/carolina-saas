const SOUND_KEY  = 'carolina_sonidos'
const VOLUME_KEY = 'carolina_volumen'  // 0-100
const TONO_KEY   = 'carolina_tono_scanner' // 1-5

const isEnabled  = () => localStorage.getItem(SOUND_KEY)  !== 'false'
const getVolumen = () => parseInt(localStorage.getItem(VOLUME_KEY) || '80') / 100

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function beep(frequency, duration, volMult = 1, type = 'square') {
  if (!isEnabled()) return
  try {
    const c      = getCtx()
    const vol    = Math.min(1, getVolumen() * volMult)
    const osc    = c.createOscillator()
    const gain   = c.createGain()

    osc.connect(gain)
    gain.connect(c.destination)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, c.currentTime)

    // Ataque rápido y decaimiento natural — más parecido a beep real
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration + 0.01)
  } catch {}
}

// Genera un beep simple con los parámetros dados
function tone(freq, dur, vol, type = 'sine', t0 = null) {
  const c  = getCtx()
  const t  = t0 ?? c.currentTime
  const os = c.createOscillator()
  const gn = c.createGain()
  os.connect(gn); gn.connect(c.destination)
  os.type = type
  os.frequency.setValueAtTime(freq, t)
  gn.gain.setValueAtTime(0, t)
  gn.gain.linearRampToValueAtTime(vol, t + 0.003)
  gn.gain.setValueAtTime(vol, t + dur - 0.015)
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur)
  os.start(t); os.stop(t + dur + 0.01)
  return t + dur
}

export const TONOS_SCANNER = [
  { id: 1, label: 'Electrónico',  desc: 'Agudo y limpio'        },
  { id: 2, label: 'Supermercado', desc: 'Clásico de caja'       },
  { id: 3, label: 'Doble',        desc: 'Di-di rápido'          },
  { id: 4, label: 'Industrial',   desc: 'Grave y profundo'      },
  { id: 5, label: 'Suave',        desc: 'Discreto, oficina'     },
]

function beepScanner() {
  if (!isEnabled()) return
  try {
    const c   = getCtx()
    const vol = getVolumen()
    const id  = parseInt(localStorage.getItem(TONO_KEY) || '1')

    if (id === 1) {
      // Electrónico: sine puro 2700 Hz, muy corto y agudo
      tone(2700, 0.07, vol, 'sine')
    } else if (id === 2) {
      // Supermercado: 1900 Hz square con filtro, 100ms
      const osc    = c.createOscillator()
      const gain   = c.createGain()
      const filter = c.createBiquadFilter()
      filter.type = 'bandpass'; filter.frequency.value = 1900; filter.Q.value = 3
      osc.connect(filter); filter.connect(gain); gain.connect(c.destination)
      osc.type = 'square'; osc.frequency.setValueAtTime(1900, c.currentTime)
      const t = c.currentTime
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.003)
      gain.gain.setValueAtTime(vol, t + 0.07)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
      osc.start(t); osc.stop(t + 0.12)
    } else if (id === 3) {
      // Doble: di-di rápido
      const t0 = tone(2200, 0.05, vol * 0.9, 'sine')
      tone(2600, 0.05, vol, 'sine', t0 + 0.03)
    } else if (id === 4) {
      // Industrial: grave 800 Hz, fuerte y corto
      tone(800, 0.09, vol, 'square')
    } else if (id === 5) {
      // Suave: 1400 Hz sine, tono discreto
      tone(1400, 0.06, vol * 0.6, 'sine')
    }
  } catch {}
}

export function useSounds() {
  return {
    scan:    beepScanner,
    success: () => {
      beep(880,  0.12, 0.8, 'sine')
      setTimeout(() => beep(1320, 0.18, 0.8, 'sine'), 140)
    },
    error:   () => beep(220, 0.35, 0.9, 'sawtooth'),
    click:   () => beep(1200, 0.04, 0.4, 'sine'),

    isEnabled,
    setEnabled:  (v) => localStorage.setItem(SOUND_KEY,  v ? 'true' : 'false'),
    getVolumen:  ()  => parseInt(localStorage.getItem(VOLUME_KEY) || '80'),
    setVolumen:  (v) => localStorage.setItem(VOLUME_KEY, String(v)),
    getTonoId:   ()  => parseInt(localStorage.getItem(TONO_KEY) || '1'),
    setTonoId:   (v) => localStorage.setItem(TONO_KEY, String(v)),
  }
}
