const { Pool } = require('pg');
const logger = require('../lib/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Error inesperado en pool de PostgreSQL', { error: err.message });
});

const db = {
  async query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query ejecutada', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  },
  async getClient() {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = () => client.release();
    return { query, release, client };
  },
};

module.exports = db;
