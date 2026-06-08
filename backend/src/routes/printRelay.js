const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/auth')
const { randomUUID } = require('crypto')
const AdmZip = require('adm-zip')
const path = require('path')
const fs = require('fs')

// ── Stores en memoria (efímero, se limpia con el proceso) ─────────────────────
const jobs  = new Map()  // token → [{id, bytes, impresora, ts}]
const beats = new Map()  // token → {ts, printers}

setInterval(() => {
  const now = Date.now()
  for (const [token, list] of jobs) {
    const fresh = list.filter(j => now - j.ts < 30000)
    fresh.length ? jobs.set(token, fresh) : jobs.delete(token)
  }
}, 10000)

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateDeviceToken(deviceId, tenantId) {
  const { rows } = await db.query(
    'SELECT id, printer_names FROM print_devices WHERE id = $1 AND tenant_id = $2',
    [deviceId, tenantId]
  )
  if (rows.length) return { token: rows[0].id, printerNames: rows[0].printer_names || [] }
  // Nuevo dispositivo
  await db.query(
    'INSERT INTO print_devices (id, tenant_id) VALUES ($1, $2)',
    [deviceId, tenantId]
  )
  return { token: deviceId, printerNames: [] }
}

// GET /api/print/status?device=<token>
// Frontend envía el device token guardado en localStorage.
// Si no tiene uno, el backend genera uno nuevo.
router.get('/status', authMiddleware, async (req, res) => {
  try {
    let deviceId = req.query.device
    if (!deviceId) {
      deviceId = randomUUID()
    }
    const { token, printerNames } = await getOrCreateDeviceToken(deviceId, req.user.tenant_id)
    const beat     = beats.get(token)
    const online   = beat ? (Date.now() - beat.ts) < 15000 : false
    const printers = beat?.printers?.length ? beat.printers : printerNames
    res.json({ online, token, printers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/print/job — frontend: encolar trabajo de impresión
router.post('/job', authMiddleware, async (req, res) => {
  try {
    const { bytes, impresora, device } = req.body
    if (!device) return res.status(400).json({ error: 'Sin device token. Ve a Configuración → Impresora.' })
    const { rows } = await db.query(
      'SELECT id FROM print_devices WHERE id = $1 AND tenant_id = $2',
      [device, req.user.tenant_id]
    )
    if (!rows.length) return res.status(400).json({ error: 'Device token inválido.' })

    const job = { id: randomUUID(), bytes, impresora, ts: Date.now() }
    if (!jobs.has(device)) jobs.set(device, [])
    jobs.get(device).push(job)
    res.json({ ok: true, jobId: job.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/print/poll/:token — servidor local: obtener trabajos pendientes
router.get('/poll/:token', (req, res) => {
  res.json({ jobs: jobs.get(req.params.token) || [] })
})

// DELETE /api/print/job/:token/:id — servidor local: marcar trabajo como hecho
router.delete('/job/:token/:id', (req, res) => {
  const { token, id } = req.params
  if (jobs.has(token)) jobs.set(token, jobs.get(token).filter(j => j.id !== id))
  res.json({ ok: true })
})

// POST /api/print/heartbeat/:token — servidor local: heartbeat + lista impresoras
router.post('/heartbeat/:token', async (req, res) => {
  const token    = req.params.token
  const printers = req.body?.printers || []
  // Validar que el token existe antes de actualizar estado
  const { rows } = await db.query('SELECT id FROM print_devices WHERE id = $1', [token])
  if (!rows.length) return res.status(404).json({ ok: false })
  beats.set(token, { ts: Date.now(), printers })
  try {
    await db.query(
      'UPDATE print_devices SET printer_names = $1 WHERE id = $2',
      [printers, token]
    )
  } catch (_) {}
  res.json({ ok: true })
})

// GET /api/print/download?device=<token> — ZIP con servidor.py + Iniciar.bat + config.json
router.get('/download', authMiddleware, async (req, res, next) => {
  try {
    let deviceId = req.query.device
    if (!deviceId) deviceId = randomUUID()
    const { token } = await getOrCreateDeviceToken(deviceId, req.user.tenant_id)

    const apiUrl = process.env.BACKEND_URL || 'https://carolina-saas-production-a4c9.up.railway.app'
    const config = { token, api: apiUrl }

    const assetsDir = path.join(__dirname, '../assets')
    const servidorPy = fs.readFileSync(path.join(assetsDir, 'servidor.py'))
    const iniciarBat = fs.readFileSync(path.join(assetsDir, 'Iniciar.bat'))

    const zip = new AdmZip()
    zip.addFile('carolinapos-print/servidor.py', servidorPy)
    zip.addFile('carolinapos-print/Iniciar.bat', iniciarBat)
    zip.addFile('carolinapos-print/config.json', Buffer.from(JSON.stringify(config, null, 2)))

    const zipBuffer = zip.toBuffer()
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="carolinapos-print.zip"')
    res.setHeader('Content-Length', zipBuffer.length)
    res.send(zipBuffer)
  } catch (err) { next(err) }
})

module.exports = router
