import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import homeRoutes from './routes/homes.js';
import messRoutes from './routes/mess.js';
import mealRoutes from './routes/meals.js';
import bazaarRoutes from './routes/bazaar.js';
import depositRoutes from './routes/deposits.js';
import summaryRoutes from './routes/summary.js';
import { pool } from './config/db.js';
import { ensureSchema } from './config/schema.js';
import { verifyMailTransport } from './services/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = env.port;

// Behind Render/Railway/Nginx: trust the first proxy so req.ip (used by rate limiting) is the real client IP
app.set('trust proxy', 1);

// CORS setup to allow web app, mobile app, and localhost ports
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Serve Logo folder static assets so apps can easily load original logo
const logoPath = path.resolve(__dirname, '../../Logo');
app.use('/assets/logo', express.static(logoPath));

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, current_database() as db');
    res.json({
      status: 'online',
      app: 'রসুইঘর (Rosuighor)',
      database: dbRes.rows[0].db,
      dbTime: dbRes.rows[0].current_time
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/homes', homeRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/bazaar', bazaarRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/summary', summaryRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start Server (after making sure the DB schema is up to date)
const start = async () => {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('❌ Database schema check failed:', err);
    process.exit(1);
  }
  await verifyMailTransport();
  app.listen(PORT, () => {
    console.log(`🍳 রসুইঘর Backend API running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
};

start();
