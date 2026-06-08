/**
 * Graba un video demo de ~1:30 de CarolinaPOS recorriendo todos los módulos.
 * Muestra primero la pantalla de login con el carrusel, luego hace el tour completo.
 *
 * Uso (PowerShell):
 *   $env:CAPTURE_EMAIL="admin@tutienda.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture-video
 */

import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, renameSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.APP_URL      || 'https://app.carolinapos.co'
const EMAIL    = process.env.CAPTURE_EMAIL
const PASSWORD = process.env.CAPTURE_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Faltan credenciales. Ejecuta así (PowerShell):\n')
  console.error('  $env:CAPTURE_EMAIL="tu@email.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture-video\n')
  process.exit(1)
}

const REPO      = join(__dirname, '../..')
const VIDEO_TMP = join(REPO, 'landing', 'brand', '_video_tmp')
const VIDEO_OUT = join(REPO, 'landing', 'brand', 'demo.webm')

function git(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim()
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Scroll suave con easing — se ejecuta dentro del browser
async function smoothScroll(page, toY, ms = 1800) {
  await page.evaluate(({ toY, ms }) => {
    return new Promise(resolve => {
      const startY = window.scrollY
      const diff   = toY - startY
      const t0     = performance.now()
      ;(function step(t) {
        const p    = Math.min((t - t0) / ms, 1)
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p  // ease-in-out
        window.scrollTo(0, startY + diff * ease)
        if (p < 1) requestAnimationFrame(step)
        else resolve()
      })(t0)
    })
  }, { toY, ms })
}

async function goTo(page, route, label) {
  process.stdout.write(`🎬  ${label}...`)
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    console.log(' ✅')
  } catch (err) {
    console.log(` ⚠️  ${err.message}`)
  }
}

;(async () => {
  mkdirSync(VIDEO_TMP, { recursive: true })

  console.log('\n🎥  Iniciando grabación de video demo (~1:30)...\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir:  VIDEO_TMP,
      size: { width: 1280, height: 720 },
    },
  })
  const page = await context.newPage()

  // ── 1. Login page — 7s mostrando el carrusel ──────────────────────────────
  console.log('🎬  Mostrando pantalla de login...')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await wait(5000)   // deja que el carrusel avance 2 diapositivas

  // Typing lento para que se vea natural
  await page.click('input[autocomplete="username"]')
  await page.type('input[autocomplete="username"]', EMAIL,    { delay: 70 })
  await wait(400)
  await page.click('input[type="password"]')
  await page.type('input[type="password"]',    PASSWORD, { delay: 70 })
  await wait(600)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/(dashboard|pos|caja)/, { timeout: 20_000 })
    console.log('✅  Login exitoso\n')
  } catch {
    console.error('❌  Login falló — revisa las credenciales')
    await context.close(); await browser.close(); process.exit(1)
  }

  // ── 2. Dashboard ──────────────────────────────────────────────────────────
  await goTo(page, '/dashboard', 'Dashboard')
  await wait(4000)
  await smoothScroll(page, 500, 2000)
  await wait(2500)
  await smoothScroll(page, 0, 1200)
  await wait(1500)

  // ── 3. Punto de Venta (POS) ───────────────────────────────────────────────
  await goTo(page, '/pos', 'Punto de Venta')
  await wait(8000)   // es la pantalla más importante — más tiempo

  // ── 4. Facturas DIAN ──────────────────────────────────────────────────────
  await goTo(page, '/facturas', 'Facturas DIAN')
  await wait(4000)
  await smoothScroll(page, 400, 1800)
  await wait(2500)
  await smoothScroll(page, 0, 1200)
  await wait(1000)

  // ── 5. Inventario / Productos ─────────────────────────────────────────────
  await goTo(page, '/productos', 'Inventario')
  await wait(4000)
  await smoothScroll(page, 450, 1800)
  await wait(2500)
  await smoothScroll(page, 0, 1200)
  await wait(1000)

  // ── 6. Clientes ───────────────────────────────────────────────────────────
  await goTo(page, '/clientes', 'Clientes')
  await wait(5000)
  await smoothScroll(page, 350, 1600)
  await wait(2000)
  await smoothScroll(page, 0, 1000)
  await wait(800)

  // ── 7. Proveedores ────────────────────────────────────────────────────────
  await goTo(page, '/proveedores', 'Proveedores')
  await wait(4500)

  // ── 8. Compras ────────────────────────────────────────────────────────────
  await goTo(page, '/compras', 'Compras')
  await wait(4500)

  // ── 9. Cartera ────────────────────────────────────────────────────────────
  await goTo(page, '/cartera', 'Cartera')
  await wait(4500)

  // ── 10. Cierres de caja ───────────────────────────────────────────────────
  await goTo(page, '/cierres', 'Cierres de caja')
  await wait(4000)
  await smoothScroll(page, 300, 1500)
  await wait(2500)
  await smoothScroll(page, 0, 1000)
  await wait(800)

  // ── 11. Reportes ─────────────────────────────────────────────────────────
  await goTo(page, '/reportes', 'Reportes')
  await wait(4000)
  await smoothScroll(page, 500, 2000)
  await wait(2500)
  await smoothScroll(page, 0, 1200)
  await wait(1000)

  // ── 12. Configuración ────────────────────────────────────────────────────
  await goTo(page, '/configuracion', 'Configuración')
  await wait(4500)

  // ── 13. Dashboard final — cierre ─────────────────────────────────────────
  await goTo(page, '/dashboard', 'Dashboard (cierre)')
  await wait(4000)

  console.log('\n⏱   Cerrando grabación...')

  // ── Guardar video ────────────────────────────────────────────────────────
  await context.close()
  await browser.close()

  const files = readdirSync(VIDEO_TMP).filter(f => f.endsWith('.webm'))
  if (!files.length) {
    console.error('\n❌  No se generó ningún video.\n')
    process.exit(1)
  }

  renameSync(join(VIDEO_TMP, files[0]), VIDEO_OUT)
  try { execSync(`rmdir /s /q "${VIDEO_TMP}"`, { cwd: REPO }) } catch {}

  const sizeKB = Math.round(statSync(VIDEO_OUT).size / 1024)
  const sizeMB = (sizeKB / 1024).toFixed(1)
  console.log(`\n✅  Video guardado: landing/brand/demo.webm (${sizeMB} MB)\n`)

  // ── Git commit + push ─────────────────────────────────────────────────────
  console.log('📦  Haciendo commit y push...')
  try {
    git('git add landing/brand/demo.webm')
    git('git commit -m "Update landing demo video (~1:30)"')
    git('git push')
    console.log('🚀  Deploy listo — el video estará en carolinapos.co en ~1 min.\n')
  } catch (err) {
    if (err.message.includes('nothing to commit')) {
      console.log('✅  El video no cambió — nada que commitear.\n')
    } else {
      console.error('❌  Error en git:', err.message)
    }
  }
})()
