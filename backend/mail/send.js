import { httpError } from '../utils/http.js';

/**
 * Transactional email through Brevo's HTTP API.
 *
 * HTTP rather than SMTP on purpose: most managed hosts block or throttle
 * outbound SMTP ports, which would leave this working locally and failing once
 * deployed. An HTTPS call has no such problem. Brevo's free tier also sends to
 * any recipient once a single sender address is verified, where some providers
 * only reach the account owner's own address until a domain is verified.
 *
 * Node 20+ has fetch built in, so this needs no email library at all.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** Give up rather than holding an HTTP request open on a slow provider. */
const SEND_TIMEOUT_MS = 10000;

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
}

/**
 * Sends one email and resolves with Brevo's messageId.
 *
 * Throws on failure instead of resolving quietly: a reset code that was never
 * delivered must not look to the caller like one that was.
 */
export async function sendEmail({ to, toName, subject, html, text }) {
  if (!isEmailConfigured()) {
    throw httpError(503, 'Email sending is not configured on the server.');
  }

  let response;
  try {
    response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME ?? 'AgriCore' },
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw httpError(502, timedOut ? 'The email service timed out. Please try again.' : 'Could not reach the email service.');
  }

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    /*
     * Brevo's own wording ("sender not valid", "credits exhausted") is useful
     * in the server log but should not travel to the browser, where it would
     * expose how the deployment is configured. The caller sends a generic
     * message instead.
     */
    console.error('[mail] Brevo rejected the send', response.status, payload ?? raw);
    throw httpError(502, 'The email could not be sent. Please try again shortly.');
  }

  return { messageId: payload?.messageId ?? null };
}
