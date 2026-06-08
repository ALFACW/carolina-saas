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

// GET /api/print/status — frontend: servidor online? + lista impresoras + token (por usuario)
router.get('/status', authMiddleware, async (req, res) => {
  try {
    let { rows } = await db.query(
      'SELECT printer_token, printer_names FROM users WHERE id = $1',
      [req.user.id]
    )
    let token = rows[0]?.printer_token
    if (!token) {
      token = randomUUID()
      await db.query('UPDATE users SET printer_token = $1 WHERE id = $2', [token, req.user.id])
    }
    const beat     = beats.get(token)
    const online   = beat ? (Date.now() - beat.ts) < 15000 : false
    const printers = beat?.printers?.length ? beat.printers : (rows[0]?.printer_names || [])
    res.json({ online, token, printers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/print/job — frontend: encolar trabajo de impresión
router.post('/job', authMiddleware, async (req, res) => {
  try {
    const { bytes, impresora } = req.body
    const { rows } = await db.query(
      'SELECT printer_token FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    )
    const token = rows[0]?.printer_token
    if (!token) return res.status(400).json({ error: 'Sin token. Ve a Configuración → Impresora.' })

    const job = { id: randomUUID(), bytes, impresora, ts: Date.now() }
    if (!jobs.has(token)) jobs.set(token, [])
    jobs.get(token).push(job)
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
  beats.set(token, { ts: Date.now(), printers })
  // Persistir en DB (en users, por usuario)
  try {
    await db.query(
      'UPDATE users SET printer_names = $1 WHERE printer_token = $2',
      [printers, token]
    )
  } catch (_) {}
  res.json({ ok: true })
})

// GET /api/print/download — ZIP con servidor.py + Iniciar.bat + config.json del tenant
router.get('/download', authMiddleware, async (req, res, next) => {
  try {
    let { rows } = await db.query(
      'SELECT printer_token FROM users WHERE id = $1',
      [req.user.id]
    )
    let token = rows[0]?.printer_token
    if (!token) {
      token = randomUUID()
      await db.query('UPDATE users SET printer_token = $1 WHERE id = $2', [token, req.user.id])
    }

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
