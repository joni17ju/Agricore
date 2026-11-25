import 'dotenv/config';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';

const PORT = process.env.PORT ?? 5000;
const app = createApp();

const connected = await connectDatabase();

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] CORS origins: ${app.locals.allowedOrigins.join(', ')}`);
  console.log(`[api] health check: http://localhost:${PORT}/api/health`);
  if (!connected) console.warn('[api] running without a database connection — /api/health will report "degraded".');
});
