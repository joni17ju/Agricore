import { httpError } from '../utils/http.js';

/**
 * A small fixed-window rate limiter, kept in process memory.
 *
 * The API runs as one instance, so memory is enough; a restart simply resets
 * the counters, which is harmless for limits this generous. Keyed on the
 * signed-in user when there is one (so classmates behind one campus NAT do not
 * share a budget), otherwise on the client address.
 */
export function rateLimit({ windowMs, max, name, message = 'Too many requests. Please wait a moment and try again.' }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs);
  sweep.unref?.();

  return (req, res, next) => {
    const who = req.user?._id ? `u:${req.user._id}` : `ip:${req.ip}`;
    const key = `${name}:${who}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      const error = httpError(429, message);
      error.code = 'rate_limited';
      return next(error);
    }
    return next();
  };
}
