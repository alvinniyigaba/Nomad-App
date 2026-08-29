// Seeds the 10 pilot users against DATABASE_URL. See api/_lib/seedData.js
// for what actually happens — this is just the local-dev entry point.
import pg from 'pg';
import { seedDatabase } from '../api/_lib/seedData.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

await client.connect();
let credentials;
try {
  credentials = await seedDatabase(client);
} finally {
  await client.end();
}

console.log(`Seeded ${credentials.length} users.\n`);
console.log('username'.padEnd(10), 'password'.padEnd(12), 'pin');
console.log('-'.repeat(34));
for (const c of credentials) {
  console.log(c.username.padEnd(10), c.password.padEnd(12), c.pin);
}
