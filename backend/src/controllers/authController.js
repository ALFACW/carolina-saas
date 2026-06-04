const bcrypt = require('bcrypt');
const { z } = require('zod');
const db = require('../db');
const { generateAccessToken, generateRefreshToken, saveRefreshToken, validateRefreshToken, revokeRefreshToken, verifyToken } = require('../lib/jwt');
const logger = require('../lib/logger');

const registerSchema = z.object({
  empresa: z.object({
    nombre: z.string().min(2),
    nit: z.string().min(5),
    email: z.string().email(),
    telefono: z.string().optional(),
    ciudad: z.string().optional(),
    plan: z.enum(['starter', 'basico', 'profesional', 'empresarial']).default('starter'),
  }),
  admin: z.object({
    nombre: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function register(req, res, next) {
  try {
    const { empresa, admin } = registerSchema.parse(req.body);

    const { rows: existing } = await db.query('SELECT id FROM tenants WHERE nit = $1 OR email = $2', [empresa.nit, empresa.email]);
    if (existing.length) return res.status(400).json({ error: 'Ya existe una empresa con ese NIT o email' });

    const { rows: tenantRows } = await db.query(
      `INSERT INTO tenants (nombre, nit, email, telefono, ciudad, plan, onboarding_completado) VALUES ($1,$2,$3,$4,$5,$6, true) RETURNING *`,
      [empresa.nombre, empresa.nit, empresa.email, empresa.telefono || null, empresa.ciudad || null, empresa.plan]
    );
    const tenant = tenantRows[0];

    const passwordHash = await bcrypt.hash(admin.password, 12);
    const { rows: userRows } = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, nombre, rol) VALUES ($1,$2,$3,$4,'admin') RETURNING id, email, nombre, rol`,
      [tenant.id, admin.email, passwordHash, admin.nombre]
    );
    const user = userRows[0];

    const payload = { id: user.id, tenant_id: tenant.id, rol: user.rol, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await saveRefreshToken(user.id, refreshToken);

    logger.info('Nuevo tenant registrado', { tenant_id: tenant.id, email: empresa.email });

    res.status(201).json({
      token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      tenant: { id: tenant.id, nombre: tenant.nombre, plan: tenant.plan, onboarding_completado: true, alegra_conectado: tenant.alegra_conectado },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { rows } = await db.query(
      `SELECT u.*, t.nombre as tenant_nombre, t.plan, t.estado as tenant_estado, t.onboarding_completado, t.alegra_conectado
       FROM users u JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.activo = true`,
      [email]
    );

    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const user = rows[0];

    if (user.tenant_estado !== 'activo') return res.status(403).json({ error: 'Tu cuenta está suspendida. Contacta soporte.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    await db.query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [user.id]);

    const payload = { id: user.id, tenant_id: user.tenant_id, rol: user.rol, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await saveRefreshToken(user.id, refreshToken);

    logger.info('Login exitoso', { user_id: user.id, tenant_id: user.tenant_id });

    res.json({
      token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      tenant: { id: user.tenant_id, nombre: user.tenant_nombre, plan: user.plan, onboarding_completado: user.onboarding_completado, alegra_conectado: user.alegra_conectado },
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token requerido' });

    let decoded;
    try {
      decoded = verifyToken(refresh_token);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    const valid = await validateRefreshToken(decoded.id, refresh_token);
    if (!valid) return res.status(401).json({ error: 'Refresh token expirado o revocado' });

    const payload = { id: decoded.id, tenant_id: decoded.tenant_id, rol: decoded.rol, email: decoded.email };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    await saveRefreshToken(decoded.id, newRefreshToken);

    res.json({ token: newAccessToken, refresh_token: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await revokeRefreshToken(req.user.id);
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.nombre, u.rol, t.id as tenant_id, t.nombre as tenant_nombre, t.plan, t.onboarding_completado, t.alegra_conectado, t.estado as tenant_estado
       FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      user: { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol },
      tenant: { id: u.tenant_id, nombre: u.tenant_nombre, plan: u.plan, onboarding_completado: u.onboarding_completado, alegra_conectado: u.alegra_conectado },
    });
  } catch (err) {
    next(err);
  }
}

async function actualizarPerfil(req, res, next) {
  try {
    const { z } = require('zod');
    const schema = z.object({
      nombre: z.string().min(2).optional(),
      email:  z.string().email().optional(),
    });
    const data = schema.parse(req.body);

    if (data.email) {
      const { rows: dup } = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [data.email, req.user.id]
      );
      if (dup.length) return res.status(400).json({ error: 'Ese email ya está en uso' });
    }

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'Sin datos para actualizar' });

    const set = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map(([, v]) => v);

    const { rows } = await db.query(
      `UPDATE users SET ${set} WHERE id = $1 RETURNING id, nombre, email, rol`,
      [req.user.id, ...values]
    );
    res.json({ mensaje: 'Perfil actualizado', user: rows[0] });
  } catch (err) { next(err); }
}

async function cambiarPassword(req, res, next) {
  try {
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual || !password_nuevo)
      return res.status(400).json({ error: 'Debes enviar la contraseña actual y la nueva' });
    if (password_nuevo.length < 6)
      return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres' });

    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const nuevoHash = await bcrypt.hash(password_nuevo, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [nuevoHash, req.user.id]);

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) { next(err); }
}

module.exports = { register, login, refresh, logout, me, actualizarPerfil, cambiarPassword };
