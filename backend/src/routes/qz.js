const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const fs      = require('fs')
const path    = require('path')
const authMiddleware = require('../middleware/auth')

// Clave privada desde variable de entorno (nunca en Git)
const PRIVATE_KEY = process.env.QZ_PRIVATE_KEY
  ? process.env.QZ_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null

router.get('/sign', (req, res) => {
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

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhS0ha/PoUf7jk+1pFPP2
hW42rEU//Tn93BCaBqLWvjacU25yxMQTPl2mU2wLKDLuiV/ONlo8ZQ5SPv0mMOQh
29sGniCnTkfZDx6mgnf4BG4crYEqOJuEz2o4LLdXqKn3JDmWTujvAY+LMavqOSOO
2MfGhrywbg3Ymo9fbPiVhbEUdCxtcvyEG5ig7vs6p/8FhFSL9GKs4ss6OybL41JZ
84P5ztpi3Im25ORWNOofSzyt+DfYJerqWYj8euNIY7TxVsjHtKjZC9s5bIcHaMtF
LvYzuZ67hR9x+xcn72keYn/3kDEZ7lbRXf4kSyeUV5gRhC3F68bYoFcGcDVSavZ8
OQIDAQAB
-----END PUBLIC KEY-----`

router.get('/certificate', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Disposition', 'attachment; filename="carolinapos-qz.pem"')
  res.send(PUBLIC_KEY)
})

module.exports = router
