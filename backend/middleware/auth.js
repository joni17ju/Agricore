import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { httpError } from '../utils/http.js';

/**
 * JWT payload — deliberately small.
 *
 *   { sub: <user _id>, role: <student|instructor|admin> }
 *
 * Only the id and role go in the token. Everything else (name, email, section,
 * avatar) is read from the database per request, so a profile edit takes effect
 * immediately instead of waiting for the token to expire, and a stale token
 * can never assert outdated identity details. The role is included because
 * route guards need it before any database round-trip.
 */
const TOKEN_TTL = process.env.JWT_EXPIRES_IN ?? '7d';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw httpError(500, 'JWT_SECRET is not configured on the server.');
  return value;
}

export function issueToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: TOKEN_TTL });
}

/**
 * Verifies the bearer token and attaches the live user record as req.user.
 * Rejects tokens whose user has since been deleted or deactivated.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next(httpError(401, 'Authentication required.'));

  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return next(httpError(401, expired ? 'Session expired — please sign in again.' : 'Invalid session token.'));
  }

  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user) return next(httpError(401, 'Account no longer exists.'));
  if (user.status !== 'active') return next(httpError(403, 'This account is not active.'));

  req.user = user;
  req.tokenPayload = payload;
  return next();
}

/**
 * Role gate, used after requireAuth:  router.get('/x', requireAuth, requireRole('instructor','admin'), handler)
 * A student's token on an instructor-only route gets 403, not 401 — it is a
 * valid session without the necessary permission.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(httpError(401, 'Authentication required.'));
    if (!roles.includes(req.user.role)) {
      return next(httpError(403, `This action requires the ${roles.join(' or ')} role.`));
    }
    return next();
  };
}

/**
 * Students may only read their own records; instructors and admins may read
 * anyone's. Used on the student-scoped query routes.
 */
export function requireSelfOrStaff(getTargetId) {
  return (req, res, next) => {
    if (!req.user) return next(httpError(401, 'Authentication required.'));
    if (req.user.role !== 'student') return next();
    const target = getTargetId(req);
    if (target && String(target) !== String(req.user._id)) {
      return next(httpError(403, 'You can only access your own records.'));
    }
    return next();
  };
}
