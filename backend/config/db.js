import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas.
 *
 * The URI only ever comes from the MONGODB_URI environment variable — it is
 * never hardcoded, and .env is gitignored so credentials stay out of the repo.
 *
 * A failure here is logged rather than fatal: the process stays up so
 * GET /api/health can report the database as disconnected, which is what tells
 * us whether the connection string is wrong versus the server being down.
 */
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[db] MONGODB_URI is not set — copy .env.example to .env and fill it in.');
    return false;
  }

  mongoose.connection.on('connected', () => console.log('[db] connected to Atlas'));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('error', (error) => console.error('[db] error:', error.message));

  try {
    await mongoose.connect(uri, {
      // Fail fast with a clear message instead of hanging when the URI, network
      // or Atlas IP allow-list is wrong.
      serverSelectionTimeoutMS: 10000,
    });
    return true;
  } catch (error) {
    console.error('[db] initial connection failed:', error.message);
    return false;
  }
}

/** Human-readable connection state for the health check. */
export function databaseStatus() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown';
}
