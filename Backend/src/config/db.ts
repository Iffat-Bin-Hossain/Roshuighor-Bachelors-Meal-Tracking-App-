import pg from 'pg';
import './env.js';

const { Pool, types } = pg;

// Return PostgreSQL DATE columns as plain 'YYYY-MM-DD' strings.
// By default node-pg converts DATE to a JS Date at *local* midnight, which shifts
// every date one day back when serialized to JSON on a UTC+6 (Bangladesh) machine.
types.setTypeParser(1082, (value: string) => value);

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
        client_encoding: 'UTF8',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5435', 10),
        database: process.env.DB_NAME || 'রসুইঘর',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        client_encoding: 'UTF8',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
