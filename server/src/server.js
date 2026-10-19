import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import aiRoutes from './routes/ai.js';
import resumeRoutes from './routes/resume.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters.');
  process.exit(1);
}
const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = [...(process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()), ...(process.env.EXTENSION_ORIGIN ? [process.env.EXTENSION_ORIGIN.trim()] : [])];
app.use(cors({ origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin is not allowed by CORS.')); }, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '300kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', service: 'applypilot-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Unexpected server error.' : err.message });
});
const port = Number(process.env.PORT || 4000);
try {
  await connectDatabase();
  app.listen(port, () => console.log(`ApplyPilot API listening on http://localhost:${port}`));
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
}
