require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');
const logger = require('../lib/logger');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info(`Ejecutando ${files.length} migraciones...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    logger.info(`Migrando: ${file}`);
    await db.query(sql);
    logger.info(`OK: ${file}`);
  }

  logger.info('Migraciones completadas.');
  process.exit(0);
}

migrate().catch(err => {
  logger.error('Error en migraciones', { error: err.message });
  process.exit(1);
});
