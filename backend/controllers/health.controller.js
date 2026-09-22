import { databaseStatus } from '../config/db.js';

/**
 * GET /api/health
 * Reports both that the server is up and whether Mongoose is actually
 * connected, so a deploy can be checked without hitting a data route.
 */
export function getHealth(req, res) {
  const database = databaseStatus();
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'agricore-api',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
