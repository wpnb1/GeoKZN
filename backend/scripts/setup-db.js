/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { spawnSync } = require('child_process');

const TARGET_DB = 'geomessenger';
const TARGET_USER = 'geomessenger_user';
const TARGET_PASS = 'geomessenger_pass';
const TARGET_PORT = 5432;
const TARGET_HOST = 'localhost';

const backendRoot = path.join(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

function isWindows() {
  return process.platform === 'win32';
}

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });
  return res;
}

function findPsql() {
  if (!isWindows()) return 'psql';

  if (process.env.PSQL_BIN) return process.env.PSQL_BIN;

  // Try PATH first.
  let r = run('psql', ['--version']);
  if (r.status === 0) return 'psql';

  // Fallback: common Windows install location.
  try {
    const base = 'C:\\Program Files\\PostgreSQL';
    const dirs = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
    for (const v of dirs) {
      const candidate = path.join(base, v, 'bin', 'psql.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    // ignore
  }

  return null;
}

const PSQL_CMD = findPsql();
function hasPsql() {
  return Boolean(PSQL_CMD);
}

function writeEnvIfMissing() {
  if (fs.existsSync(envPath)) return;

  const contents = [
    `PORT=4000`,
    `DATABASE_URL=postgres://${TARGET_USER}:${TARGET_PASS}@${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}`,
    `JWT_SECRET=change_me_dev_secret`,
    ``,
  ].join('\n');

  fs.writeFileSync(envPath, contents, 'utf8');
  console.log('Created backend/.env');
}

function printWindowsInstallHelp() {
  console.log('\nPostgreSQL не найден (psql не установлен или не в PATH).');
  console.log('Установка для Windows:');
  console.log('- Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/');
  console.log('- Во время установки включите компонент "Command Line Tools" (psql).');
  console.log('- После установки откройте новый терминал и проверьте: psql --version');
  console.log('- Затем снова выполните: npm run dev');
  console.log('');
}

function psqlExec(connectionArgs, sql) {
  // -v ON_ERROR_STOP=1 makes psql exit non-zero on error
  const args = [...connectionArgs, '-v', 'ON_ERROR_STOP=1', '-c', sql];
  return run(PSQL_CMD, args, { env: process.env });
}

function tryConnectAsPostgres() {
  // Try without password (trust/peer setups)
  const base = ['-h', TARGET_HOST, '-p', String(TARGET_PORT), '-U', 'postgres', '-d', 'postgres'];
  const r = psqlExec(base, 'SELECT 1;');
  return { ok: r.status === 0, result: r };
}

function ensureRoleAndDb() {
  const { ok, result } = tryConnectAsPostgres();
  if (!ok) {
    console.log('\nНе удалось подключиться к PostgreSQL как суперпользователь postgres.');
    console.log('Причина (вывод psql):');
    console.log((result.stderr || result.stdout || '').trim() || '(пусто)');
    console.log('\nЧтобы автоматическая настройка могла создать БД/пользователя, нужно иметь доступ суперпользователя.');
    console.log('Варианты (Windows):');
    console.log('- Откройте "SQL Shell (psql)" от PostgreSQL и выполните команды ниже вручную, затем снова npm run dev.');
    console.log('- Или настройте локальное доверие для localhost в pg_hba.conf (не рекомендуется для продакшна).');
    console.log('\nКоманды для ручного выполнения (в psql под postgres):');
    console.log(`DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TARGET_USER}') THEN
    CREATE ROLE ${TARGET_USER} LOGIN PASSWORD '${TARGET_PASS}';
  END IF;
END $$;`);
    console.log(`DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TARGET_DB}') THEN
    CREATE DATABASE ${TARGET_DB} OWNER ${TARGET_USER};
  END IF;
END $$;`);
    console.log(`GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${TARGET_USER};`);
    console.log('');
    process.exit(1);
  }

  const conn = ['-h', TARGET_HOST, '-p', String(TARGET_PORT), '-U', 'postgres', '-d', 'postgres'];

  const createRoleSql = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TARGET_USER}') THEN
    CREATE ROLE ${TARGET_USER} LOGIN PASSWORD '${TARGET_PASS}';
  END IF;
END $$;`;
  let r = psqlExec(conn, createRoleSql);
  if (r.status !== 0) {
    console.log('Failed to create role:', (r.stderr || '').trim());
    process.exit(1);
  }

  const createDbSql = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TARGET_DB}') THEN
    CREATE DATABASE ${TARGET_DB} OWNER ${TARGET_USER};
  END IF;
END $$;`;
  r = psqlExec(conn, createDbSql);
  if (r.status !== 0) {
    console.log('Failed to create database:', (r.stderr || '').trim());
    process.exit(1);
  }

  const grantSql = `GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB} TO ${TARGET_USER};`;
  r = psqlExec(conn, grantSql);
  if (r.status !== 0) {
    console.log('Failed to grant privileges:', (r.stderr || '').trim());
    process.exit(1);
  }

  console.log('Database/user ensured.');
}

async function testQuery() {
  const { Pool } = require('pg');
  const url = `postgres://${TARGET_USER}:${TARGET_PASS}@${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}`;
  const pool = new Pool({ connectionString: url });
  try {
    const res = await pool.query('SELECT 1 AS ok');
    if (res.rows?.[0]?.ok !== 1) throw new Error('Unexpected result');
    console.log('Test query OK (SELECT 1).');
  } finally {
    await pool.end();
  }
}

async function runMigrations() {
  const migrate = require('../src/migrate');
  await migrate.run();
}

async function main() {
  writeEnvIfMissing();

  if (!hasPsql()) {
    printWindowsInstallHelp();
    process.exit(1);
  }

  ensureRoleAndDb();

  // Ensure env points to our DB for migrations
  process.env.DATABASE_URL = `postgres://${TARGET_USER}:${TARGET_PASS}@${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}`;

  await runMigrations();
  await testQuery();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
