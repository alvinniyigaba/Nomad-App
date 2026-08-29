import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const schemaPath = fileURLToPath(new URL('../db/schema.sql', import.meta.url));
const schema = readFileSync(schemaPath, 'utf-8');

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(schema);
  console.log('Schema applied.');
} finally {
  await client.end();
}
