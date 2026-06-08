/**
 * Graba un video demo de CarolinaPOS navegando por los módulos principales.
 * Guarda el resultado en landing/brand/demo.webm y hace git push automático.
 *
 * Uso (PowerShell):
 *   $env:CAPTURE_EMAIL="admin@tutienda.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture-video
 */

import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, renameSync, existsSync } from 'fs'
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

// Módulos a recorrer y cuántos segundos pausar en cada uno
const TOUR = [
  { route: '/dashboard',  label: 'Dashboard',        wait: 3500 },
  { route: '/pos',        label: 'Punto de Venta',   wait: 4000 },
  { route: '/facturas',   label: 'Facturas DIAN',    wait: 3500 },
  { route: '/productos',  label: 'Inventario',       wait: 3500 },
  { route: '/clientes',   label: 'Clientes',         wait: 3000 },
  { route: '/cierres',    label: 'Cierres de caja',  wait: 3000 },
]

function git(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim()
}

;(async () => {
  mkdirSync(VIDEO_TMP, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: VIDEO_TMP,
      size: { width: 1280, height: 720 },
    },
  })
  const page = await context.newPage()

  // ── Login ──────────────────────────────────────────────────────────────────
  console.log(`\n🌐  Conectando a ${BASE_URL}...`)
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[autocomplete="username"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL(/\/(dashboard|pos|caja)/, { timeout: 20_000 })
    console.log('✅  Login exitoso\n')
  } catch {
    console.error('❌  Login falló — revisa las credenciales')
    await context.close()
    await browser.close()
    process.exit(1)
  }

  // ── Tour por módulos ───────────────────────────────────────────────────────
  for (const stop of TOUR) {
    process.stdout.write(`🎬  Grabando ${stop.label}...`)
    try {
      await page.goto(`${BASE_URL}${stop.route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await new Promise(r => setTimeout(r, stop.wait))
      console.log(' ✅')
    } catch (err) {
      console.log(` ⚠️  ${err.message}`)
    }
  }

  // Pausa final en dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2500))

  // ── Guardar video ──────────────────────────────────────────────────────────
  await context.close()
  await browser.close()

  // Playwright guarda el video con nombre aleatorio en VIDEO_TMP
  const { readdirSync } = await import('fs')
  const files = readdirSync(VIDEO_TMP).filter(f => f.endsWith('.webm'))
  if (!files.length) {
    console.error('\n❌  No se generó ningún video.\n')
    process.exit(1)
  }

  const src = join(VIDEO_TMP, files[0])
  renameSync(src, VIDEO_OUT)
  // limpia el directorio temporal
  try { execSync(`rmdir /s /q "${VIDEO_TMP}"`, { cwd: REPO }) } catch {}

  const sizeKB = Math.round(existsSync(VIDEO_OUT) ? (await import('fs')).statSync(VIDEO_OUT).size / 1024 : 0)
  console.log(`\n✅  Video guardado: landing/brand/demo.webm (${sizeKB} KB)\n`)

  // ── Git commit + push ──────────────────────────────────────────────────────
  console.log('📦  Haciendo commit y push...')
  try {
    git('git add landing/brand/demo.webm')
    git('git commit -m "Update landing demo video"')
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
