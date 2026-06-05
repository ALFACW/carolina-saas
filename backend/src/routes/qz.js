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

const QZ_CERT = `-----BEGIN CERTIFICATE-----
MIIDDTCCAfWgAwIBAgIUXilb7R9B5I0vE/svUw+YasP4zBgwDQYJKoZIhvcNAQEL
BQAwFjEUMBIGA1UEAwwLQ2Fyb2xpbmFQT1MwHhcNMjYwNjA1MjEzODAxWhcNMzYw
NjAyMjEzODAxWjAWMRQwEgYDVQQDDAtDYXJvbGluYVBPUzCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAIUtIWvz6FH+45PtaRTz9oVuNqxFP/05/dwQmgai
1r42nFNucsTEEz5dplNsCygy7olfzjZaPGUOUj79JjDkIdvbBp4gp05H2Q8epoJ3
+ARuHK2BKjibhM9qOCy3V6ip9yQ5lk7o7wGPizGr6jkjjtjHxoa8sG4N2JqPX2z4
lYWxFHQsbXL8hBuYoO77Oqf/BYRUi/RirOLLOjsmy+NSWfOD+c7aYtyJtuTkVjTq
H0s8rfg32CXq6lmI/HrjSGO08VbIx7So2QvbOWyHB2jLRS72M7meu4UfcfsXJ+9p
HmJ/95AxGe5W0V3+JEsnlFeYEYQtxevG2KBXBnA1Umr2fDkCAwEAAaNTMFEwHQYD
VR0OBBYEFHi+cxvX/Kd12OeLvFUWX7Fm5LSkMB8GA1UdIwQYMBaAFHi+cxvX/Kd1
2OeLvFUWX7Fm5LSkMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB
ABk7d25RGHl5vCjCYGx8JLvYaAwE2XOt3Cd0o5VcsHRn73ZkaW4bcUbBhKh18Tnp
/cf0dPGWyVyWzNc4V/c2eYyvJWaIZBk0cGaUxm/wrAXqGzZcVfAJZpTuLhpu2vXP
Qvs1Yd/G2eXt1dNqn0xMH2gNjAcZ8nZ8UjE3jKR5/48U5tmZAj6gxzfKtUKrTIz4
Qafhld4o0Um1VA6iYLgN72M4SolO6w8d5Ievo5ZmZ3pWhcAIoV9W65XIlKlWTXtg
OgJR4XFiVy/HGD52bGiYYmhQViNOow5r/aRx9RKQxjMxlpQUiYf6hlbE3mpGLYX3
vP3fjL/OPPcTDnntiLXXAfs=
-----END CERTIFICATE-----`

router.get('/certificate', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send(QZ_CERT)
})

module.exports = router
