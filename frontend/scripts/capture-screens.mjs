/**
 * Captura screenshots de cada módulo de CarolinaPOS para el carrusel del login.
 *
 * Uso:
 *   $env:CAPTURE_EMAIL="admin@tutienda.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture
 *
 * Env opcionales:
 *   APP_URL  — default: https://app.carolinapos.co
 */

import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL  = process.env.APP_URL       || 'https://app.carolinapos.co'
const EMAIL     = process.env.CAPTURE_EMAIL
const PASSWORD  = process.env.CAPTURE_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Faltan credenciales. Ejecuta así (PowerShell):\n')
  console.error('  $env:CAPTURE_EMAIL="tu@email.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture\n')
  process.exit(1)
}

const SCREENS = [
  { name: 'pos',        route: '/pos'       },
  { name: 'dashboard',  route: '/dashboard' },
  { name: 'facturas',   route: '/facturas'  },
  { name: 'productos',  route: '/productos' },
  { name: 'cierres',    route: '/cierres'   },
]

const OUT = join(__dirname, '../public/brand/screens')

;(async () => {
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport:          { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  // ── Login ────────────────────────────────────────────────────────────────────
  console.log(`\n🌐  Conectando a ${BASE_URL}...`)
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')

  await page.fill('input[autocomplete="username"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/dashboard', { timeout: 20_000 })
    console.log('✅  Login exitoso\n')
  } catch {
    // Puede haber redirigido a /caja/abrir primero
    const url = page.url()
    if (!url.includes('/dashboard') && !url.includes('/pos') && !url.includes('/caja')) {
      console.error('❌  Login falló — revisa las credenciales')
      await browser.close()
      process.exit(1)
    }
    console.log('✅  Login exitoso (sesión de caja activa)\n')
  }

  // ── Screenshots ──────────────────────────────────────────────────────────────
  for (const s of SCREENS) {
    process.stdout.write(`📸  Capturando /${s.name}...`)
    try {
      await page.goto(`${BASE_URL}${s.route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      // Espera extra para que carguen datos y gráficas
      await new Promise(r => setTimeout(r, 1800))

      await page.screenshot({
        path: join(OUT, `${s.name}.png`),
        clip: { x: 0, y: 0, width: 1440, height: 900 },
      })
      console.log(' ✅')
    } catch (err) {
      console.log(` ⚠️  Error: ${err.message}`)
    }
  }

  await browser.close()
  console.log(`\n✨  Imágenes guardadas en frontend/public/brand/screens/`)
  console.log('   Haz git add + commit para incluirlas en el deploy.\n')
})()
