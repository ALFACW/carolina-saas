const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const fs      = require('fs')
const path    = require('path')
const { authenticateToken } = require('../middleware/auth')

// Clave privada desde variable de entorno (nunca en Git)
const PRIVATE_KEY = process.env.QZ_PRIVATE_KEY
  ? process.env.QZ_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null

router.get('/sign', authenticateToken, (req, res) => {
  try {
    const toSign = req.query.request
    if (!toSign) return res.status(400).json({ error: 'Falta el parámetro request' })
    if (!PRIVATE_KEY) return res.status(503).json({ error: 'QZ_PRIVATE_KEY no configurada' })

    const sign = crypto.createSign('SHA512')
    sign.update(toSign)
    const signature = sign.sign(PRIVATE_KEY, 'base64')

    res.send(signature)
  } catch (err) {
    res.status(500).json({ error: 'Error al firmar: ' + err.message })
  }
})

// Devuelve la clave pública para que el cliente la descargue
router.get('/certificate', (req, res) => {
  try {
    const PUBLIC_KEY_PATH = path.join(__dirname, '../../qz-public.pem')
    const cert = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Content-Disposition', 'attachment; filename="carolinapos-qz.pem"')
    res.send(cert)
  } catch (err) {
    res.status(500).json({ error: 'Certificado no encontrado' })
  }
})

module.exports = router
