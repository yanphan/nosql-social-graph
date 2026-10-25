import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { env } from './config/env.js';
import { audit } from './middlewares/audit.js';
import { errorHandler } from './middlewares/error.js';

export async function createApp() {
  const app = express();

  app.use(
    helmet(),
    cors({ origin: env.corsOrigin }),
    express.json({ limit: '2mb' }),
    morgan('dev')
  );

  // Root route: Tự động chuyển hướng sang giao diện Frontend (port 5173)
  app.get('/', (_req, res) => {
    res.redirect('http://localhost:5173');
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, data: { db: 'up', graph: env.db.graph } });
  });

  // Alias tương thích chuẩn spec GET /benchmark -> /api/benchmark
  app.get('/benchmark', (req, res, next) => {
    req.url = '/api/benchmark';
    app.handle(req, res, next);
  });

  // Tự động nạp mọi routes/*.routes.js
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'routes');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.routes.js'))) {
      const m = await import(pathToFileURL(path.join(dir, f)).href);
      app.use('/api' + (m.prefix ?? '/'), audit, m.default);
    }
  }

  // 404 Not Found handler
  app.use((_req, _res, next) => {
    const err = new Error('Không tìm thấy đường dẫn');
    err.status = 404;
    err.code = 'NOT_FOUND';
    next(err);
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
