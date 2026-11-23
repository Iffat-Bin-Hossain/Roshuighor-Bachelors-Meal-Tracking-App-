import { query } from './db.js';

/**
 * Idempotent migrations applied on every startup.
 * Database/init.sql only runs when the Postgres volume is first created,
 * so columns/tables added later must also be ensured here for existing databases.
 */
export const ensureSchema = async (): Promise<void> => {
  // Existing accounts (created before email verification existed) are grandfathered as verified;
  // every new account starts unverified.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE`);
  await query(`ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE`);

  await query(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose VARCHAR(20) NOT NULL,
      code_hash VARCHAR(128) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      consumed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_email_otps_user_purpose ON email_otps(user_id, purpose, created_at DESC)`);
};
