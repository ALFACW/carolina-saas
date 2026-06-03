const { createClient } = require('redis');
const logger = require('./logger');

let client = null;
let useMemory = false;

// Fallback en memoria para desarrollo sin Redis
const memStore = new Map();
const memExpiry = new Map();

const memoryAdapter = {
  async setEx(key, ttl, value) {
    memStore.set(key, value);
    memExpiry.set(key, Date.now() + ttl * 1000);
  },
  async get(key) {
    const exp = memExpiry.get(key);
    if (exp && Date.now() > exp) { memStore.delete(key); memExpiry.delete(key); return null; }
    return memStore.get(key) || null;
  },
  async del(key) { memStore.delete(key); memExpiry.delete(key); },
};

async function getRedisClient() {
  if (useMemory) return memoryAdapter;
  if (client && client.isOpen) return client;

  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    client.on('error', () => {});
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    logger.info('Redis conectado');
    return client;
  } catch {
    useMemory = true;
    client = null;
    logger.warn('Redis no disponible — usando memoria (solo desarrollo)');
    return memoryAdapter;
  }
}

async function setRefreshToken(userId, token, expiresIn = 2592000) {
  const redis = await getRedisClient();
  await redis.setEx(`refresh:${userId}`, expiresIn, token);
}

async function getRefreshToken(userId) {
  const redis = await getRedisClient();
  return redis.get(`refresh:${userId}`);
}

async function deleteRefreshToken(userId) {
  const redis = await getRedisClient();
  await redis.del(`refresh:${userId}`);
}

async function setCache(key, value, ttl = 300) {
  const redis = await getRedisClient();
  await redis.setEx(key, ttl, JSON.stringify(value));
}

async function getCache(key) {
  const redis = await getRedisClient();
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

async function deleteCache(key) {
  const redis = await getRedisClient();
  await redis.del(key);
}

module.exports = { getRedisClient, setRefreshToken, getRefreshToken, deleteRefreshToken, setCache, getCache, deleteCache };
