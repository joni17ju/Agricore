import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();
const PORT = process.env.PORT ?? 5000;

/*
 * Allowed origins come from CORS_ORIGINS (comma-separated) so adding the
 * deployed Vercel URL later is a config change, not a code change.
 */
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

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
  }),
);
app.use(express.json({ limit: '2mb' })); // Headroom for data-URL images.

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

const connected = await connectDatabase();

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`[api] health check: http://localhost:${PORT}/api/health`);
  if (!connected) console.warn('[api] running without a database connection — /api/health will report "degraded".');
});
