import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

/**
 * The Express app, without a database connection or a listening port, so
 * the automated tests can mount it against an in-memory MongoDB.
 */
export function createApp({ corsOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:5173' } = {}) {
  const app = express();

  /*
   * Allowed origins come from CORS_ORIGINS (comma-separated) so adding the
   * deployed Vercel URL later is a config change, not a code change.
   */
  const allowedOrigins = String(corsOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Render terminates TLS in front of the app; rate limits key on the real client.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: curl, Postman, same-origin or server-to-server.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // Carry a status so a blocked origin reads as 403, not a server fault.
        const error = new Error(`Origin not allowed by CORS: ${origin}`);
        error.status = 403;
        return callback(error);
      },
      credentials: true,
      // Lets browsers reuse the preflight for ten minutes instead of asking
      // again before every authenticated request.
      maxAge: 600,
    }),
  );

  /*
   * gzip/deflate for JSON. Lesson bodies and the course lists are large and
   * very repetitive text, so they shrink several times over on the wire.
   */
  app.use(compression({ threshold: 1024 }));

  /*
   * Data-URL uploads are capped at 1.5MB client-side, but base64 inflates a file
   * by about a third, so a 1.5MB image arrives as roughly 2MB. A 2mb limit sat
   * exactly on that boundary and rejected legitimate avatar uploads; 4mb leaves
   * real headroom.
   */
  app.use(express.json({ limit: '4mb' }));

  // API responses are per-user and must never be cached by a shared proxy.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  app.locals.allowedOrigins = allowedOrigins;
  return app;
}
