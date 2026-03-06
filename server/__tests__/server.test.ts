import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { createServer, type Server } from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let server: Server;
let baseUrl: string;

/**
 * Helper: start the Express app on a random port and return the base URL.
 * We dynamically import the app to avoid module-level side effects.
 */
async function startApp(): Promise<{ server: Server; baseUrl: string }> {
  // Set PORT to 0 so the OS picks a random available port
  process.env.PORT = '0';
  const { app } = await import('../index.js');
  return new Promise((resolve) => {
    const srv = createServer(app);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server: srv, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Express Server', () => {
  beforeAll(async () => {
    const result = await startApp();
    server = result.server;
    baseUrl = result.baseUrl;
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('GET /api/health', () => {
    it('returns 200 with JSON containing status, timestamp, and uptime', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(typeof body.timestamp).toBe('string');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      // Verify timestamp is valid ISO string
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  describe('Static file serving', () => {
    const distPath = path.join(__dirname, '..', '..', 'dist');
    const hasDistDir = fs.existsSync(distPath);

    it('serves static files from dist/ when directory exists', async () => {
      if (!hasDistDir) {
        // Skip if dist/ doesn't exist -- test is valid only when dist/ is present
        return;
      }
      // If dist/ exists, check that index.html is served
      const res = await fetch(`${baseUrl}/index.html`);
      expect(res.status).toBe(200);
    });

    it('returns index.html for non-API GET routes (SPA catch-all) when dist/ exists', async () => {
      if (!hasDistDir) {
        return;
      }
      const res = await fetch(`${baseUrl}/some/random/route`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('<!DOCTYPE html');
    });
  });

  describe('Dev mode (no dist/)', () => {
    it('server starts without static serving when dist/ does not exist', async () => {
      // The server should start regardless of dist/ existence.
      // The health endpoint must still work.
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
    });
  });
});
