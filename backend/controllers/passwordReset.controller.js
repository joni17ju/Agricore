import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { issueResetToken, readResetToken } from '../middleware/auth.js';
import { httpError } from '../utils/http.js';
import { buildIdentifierQuery } from '../utils/identifiers.js';
import { MIN_PASSWORD_LENGTH, SALT_ROUNDS } from '../constants/auth.js';
import { isEmailConfigured, sendEmail } from '../mail/send.js';
import { resetCodeHtml, resetCodeSubject, resetCodeText } from '../mail/resetCodeEmail.js';
import {
  EXPIRY_MINUTES,
  MAX_REQUESTS_PER_WINDOW,
  MAX_VERIFY_ATTEMPTS,
  RATE_LIMIT_WINDOW_MINUTES,
  codeMatches,
  generateCode,
  hashCode,
  isExpired,
  isWellFormedCode,
  minutesFromNow,
} from '../utils/passwordReset.js';

/**
 * Forgotten-password flow: request a code, verify it, set a new password.
 *
 * Three endpoints rather than one so the code is never posted alongside the
 * new password. Verifying returns a short-lived reset token, and only that
 * token can set the password — so the code itself is spent the moment it is
 * checked, and never has to be held by the browser afterwards.
 */

/**
 * Every response on the request step is this, whether or not the account
 * exists, whether or not it is rate-limited, and whether or not mail went out.
 *
 * Saying "no account with that email" would turn this endpoint into a way to
 * discover which addresses and school IDs are registered, which for a class
 * roster is exactly the list worth protecting. The cost is that a user who has
 * hit the per-account limit sees success and gets no mail, so the UI states
 * the limit up front rather than leaving that silence unexplained.
 */
const GENERIC_REQUEST_MESSAGE =
  'If an account matches what you entered, a verification code is on its way. Check your inbox, including the spam folder.';

/** One message for a wrong code, an expired code and an unknown account alike. */
const badCode = () => httpError(400, 'That code is incorrect or has expired. Request a new one to continue.');

/**
 * Has this account already been sent its allowance of codes?
 *
 * The window is a fixed block rather than a rolling one: the first request
 * starts it, and the counter resets once RATE_LIMIT_WINDOW_MINUTES have passed
 * since then. Simpler than a sliding window and enough to stop someone using
 * the endpoint to flood a real inbox.
 */
function isRateLimited(reset) {
  if (!reset?.windowStartedAt) return false;
  const windowEnds = reset.windowStartedAt.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  if (Date.now() >= windowEnds) return false;
  return (reset.requestCount ?? 0) >= MAX_REQUESTS_PER_WINDOW;
}

/** Starts a new counting window, or continues the current one. */
function nextRequestCount(reset) {
  if (!reset?.windowStartedAt) return { requestCount: 1, windowStartedAt: new Date() };
  const windowEnds = reset.windowStartedAt.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  if (Date.now() >= windowEnds) return { requestCount: 1, windowStartedAt: new Date() };
  return { requestCount: (reset.requestCount ?? 0) + 1, windowStartedAt: reset.windowStartedAt };
}

/**
 * POST /api/auth/forgot-password  { identifier }
 *
 * `identifier` is an email address or a school ID, the same rule the login
 * form uses, so someone who signs in with their student number can reset with
 * it too.
 */
export async function requestPasswordReset(req, res) {
  const { identifier } = req.body ?? {};
  if (!String(identifier ?? '').trim()) throw httpError(400, 'Enter your email address or school ID.');

  /*
   * A misconfigured server must not answer with the reassuring generic
   * message: that would tell every user their code is coming while nothing is
   * being sent. This is the one case worth failing loudly on.
   */
  if (!isEmailConfigured()) throw httpError(503, 'Password reset email is not configured on this server.');

  const query = buildIdentifierQuery(identifier);
  const user = query ? await User.findOne(query) : null;

  // Unknown account: answer exactly as if one had been found, and send nothing.
  if (!user) return res.json({ message: GENERIC_REQUEST_MESSAGE });

  if (isRateLimited(user.passwordReset)) {
    console.warn('[password-reset] rate limit reached for user', String(user._id));
    return res.json({ message: GENERIC_REQUEST_MESSAGE });
  }

  const code = generateCode();
  const { requestCount, windowStartedAt } = nextRequestCount(user.passwordReset);

  user.passwordReset = {
    codeHash: hashCode(code),
    expiresAt: minutesFromNow(EXPIRY_MINUTES),
    // A new code starts its own guess budget.
    attemptCount: 0,
    requestCount,
    windowStartedAt,
    verifiedAt: null,
  };
  await user.save();

  /*
   * Saved before sending, so a code that reaches the inbox always has a record
   * behind it. The reverse order risks mail going out that the server cannot
   * honour. If the send then fails, the stored code simply expires unused.
   */
  await sendEmail({
    to: user.email,
    toName: `${user.firstName} ${user.lastName}`,
    subject: resetCodeSubject(code),
    html: resetCodeHtml({ firstName: user.firstName, code, expiryMinutes: EXPIRY_MINUTES }),
    text: resetCodeText({ firstName: user.firstName, code, expiryMinutes: EXPIRY_MINUTES }),
  });

  res.json({ message: GENERIC_REQUEST_MESSAGE });
}

/**
 * POST /api/auth/verify-reset-code  { identifier, code }
 *
 * On success the code is spent and a reset token takes its place. The token
 * expires with the original code rather than starting a fresh clock, so the
 * whole flow stays inside the one advertised window.
 */
export async function verifyResetCode(req, res) {
  const { identifier, code } = req.body ?? {};
  if (!String(identifier ?? '').trim()) throw httpError(400, 'Enter your email address or school ID.');
  if (!isWellFormedCode(code)) throw badCode();

  const query = buildIdentifierQuery(identifier);
  const user = query ? await User.findOne(query) : null;
  if (!user) throw badCode();

  const reset = user.passwordReset;
  if (!reset?.codeHash || isExpired(reset.expiresAt)) throw badCode();

  // Out of guesses: burn the code rather than letting the attempts continue.
  if ((reset.attemptCount ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    user.passwordReset.codeHash = null;
    user.passwordReset.expiresAt = null;
    await user.save();
    throw badCode();
  }

  if (!codeMatches(String(code).trim(), reset.codeHash)) {
    user.passwordReset.attemptCount = (reset.attemptCount ?? 0) + 1;
    await user.save();
    throw badCode();
  }

  /*
   * Correct. The code is cleared immediately — it is single-use, so replaying
   * it must fail even within the expiry window — and verifiedAt marks the
   * account as ready for a new password.
   */
  const expiresAt = reset.expiresAt;
  user.passwordReset.codeHash = null;
  user.passwordReset.attemptCount = 0;
  user.passwordReset.verifiedAt = new Date();
  await user.save();

  const secondsLeft = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  res.json({ resetToken: issueResetToken(user, secondsLeft), expiresInSeconds: secondsLeft });
}

/**
 * POST /api/auth/reset-password  { resetToken, newPassword }
 *
 * Deliberately does not sign the user in. Proving you can read an inbox is
 * enough to set a new password, but the new password should still be typed
 * once at the login screen — which also confirms it was stored as intended.
 */
export async function resetPassword(req, res) {
  const { resetToken, newPassword } = req.body ?? {};
  if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const expired = httpError(401, 'This reset session has expired. Start again to get a new code.');
  const userId = readResetToken(resetToken);
  if (!userId) throw expired;

  const user = await User.findById(userId);
  if (!user) throw expired;

  // The token alone is not enough: the account must still be in the verified
  // state, which is what makes the reset single-use once it is consumed below.
  const reset = user.passwordReset;
  if (!reset?.verifiedAt || isExpired(reset.expiresAt)) throw expired;

  user.passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  // Clearing this consumes the reset: the same token cannot be used twice, and
  // any code still outstanding for this account dies with it.
  user.passwordReset = null;
  await user.save();

  res.json({ updated: true });
}
