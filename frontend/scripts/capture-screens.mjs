/**
 * Captura screenshots de cada módulo de CarolinaPOS y hace deploy automático.
 *
 * Uso (PowerShell):
 *   $env:CAPTURE_EMAIL="admin@tutienda.com"; $env:CAPTURE_PASSWORD="tupass"; npm run capture
 *
 * Env opcionales:
 *   APP_URL  — default: https://app.carolinapos.co
 */

import { chromium } from 'playwright'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.APP_URL      || 'https://app.carolinapos.co'
const EMAIL    = process.env.CAPTURE_EMAIL
const PASSWORD = process.env.CAPTURE_PASSWORD

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

const OUT     = join(__dirname, '../public/brand/screens')
const REPO    = join(__dirname, '../..')   // raíz del repo git

function git(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim()
}

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
    const url = page.url()
    if (!url.includes('/dashboard') && !url.includes('/pos') && !url.includes('/caja')) {
      console.error('❌  Login falló — revisa las credenciales')
      await browser.close()
      process.exit(1)
    }
    console.log('✅  Login exitoso (sesión de caja activa)\n')
  }

  // ── Screenshots ──────────────────────────────────────────────────────────────
  const captured = []
  for (const s of SCREENS) {
    process.stdout.write(`📸  Capturando ${s.route}...`)
    try {
      await page.goto(`${BASE_URL}${s.route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 1800))

      const outPath = join(OUT, `${s.name}.png`)
      await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1440, height: 900 } })
      captured.push(`frontend/public/brand/screens/${s.name}.png`)
      console.log(' ✅')
    } catch (err) {
      console.log(` ⚠️  ${err.message}`)
    }
  }

  await browser.close()

  if (captured.length === 0) {
    console.error('\n❌  No se capturó ninguna imagen — abortando deploy.\n')
    process.exit(1)
  }

  // ── Git commit + push ────────────────────────────────────────────────────────
  console.log('\n📦  Haciendo commit y push...')
  try {
    git(`git add ${captured.join(' ')}`)
    git(`git commit -m "Update login carousel screenshots (${captured.length} screens)"`)
    git('git push')
    console.log('🚀  Deploy listo — Netlify actualizará en ~1 min.\n')
  } catch (err) {
    if (err.message.includes('nothing to commit')) {
      console.log('✅  Las imágenes no cambiaron — nada que commitear.\n')
    } else {
      console.error('❌  Error en git:', err.message)
    }
  }
})()
