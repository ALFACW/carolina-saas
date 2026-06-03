const jwt = require('jsonwebtoken');
const { setRefreshToken, getRefreshToken, deleteRefreshToken } = require('./redis');

const JWT_SECRET = () => process.env.JWT_SECRET;
const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '7d';

function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET());
}

async function saveRefreshToken(userId, token) {
  await setRefreshToken(userId, token, 2592000);
}

async function validateRefreshToken(userId, token) {
  const saved = await getRefreshToken(userId);
  return saved === token;
}

async function revokeRefreshToken(userId) {
  await deleteRefreshToken(userId);
}

module.exports = { generateAccessToken, generateRefreshToken, verifyToken, saveRefreshToken, validateRefreshToken, revokeRefreshToken };
