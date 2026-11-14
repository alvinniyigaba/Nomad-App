import pg from 'pg';

// Reused across warm serverless invocations — don't open a new pool per call.
let pool;

// Always verify the database's TLS certificate. Today pg reads `sslmode=require`
// in DATABASE_URL as full verification, but warns that pg v9 will weaken it.
// Dropping sslmode from the URL and setting `ssl` here keeps today's behaviour
// whatever the URL says or whichever pg version is installed.
export function connectionConfig(raw) {
  if (raw.includes('localhost')) return { connectionString: raw, ssl: false };
  const url = new URL(raw);
  url.searchParams.delete('sslmode');
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
}

export function db() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({ ...connectionConfig(connectionString), max: 5 });
  }
  return pool;
}

export async function query(text, params) {
  return db().query(text, params);
}

export async function withTransaction(fn) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
