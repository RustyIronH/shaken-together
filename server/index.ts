import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { healthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Allow accelerometer/gyroscope so DeviceMotion works on mobile
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=(self), gyroscope=(self)');
  next();
});

// JSON body parsing for future API routes
app.use(express.json());

// --- API Routes ---
app.use('/api', healthRouter);

// --- Static Frontend ---
const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA catch-all (must be after API routes and static middleware)
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('No dist/ directory found -- frontend not served (dev mode)');
}

// --- Global Error Handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only listen when run directly (not imported for testing)
const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('server-dist/index.js') ||
   process.argv[1].endsWith('server/index.ts'));

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Shaken Together server running on port ${PORT}`);
  });
}

export { app };
