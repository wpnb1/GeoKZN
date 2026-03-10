const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { pool } = require('./db');

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
}

async function run() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'seed.sql');

  console.log('Running schema.sql...');
  await runSqlFile(schemaPath);

  console.log('Running seed.sql...');
  await runSqlFile(seedPath);

  console.log('Migrations done.');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { run };
