const { Pool } = require('pg');

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  connectionTimeoutMillis: 5000,
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
