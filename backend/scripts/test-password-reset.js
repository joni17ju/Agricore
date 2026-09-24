/**
 * Verifies the forgotten-password endpoints against a running API.
 *
 * The rate limit, the attempt budget and expiry all depend on stored state
 * that would otherwise take fifteen minutes and several real emails to reach,
 * so this script writes that state straight into the user document and then
 * drives the real HTTP endpoints against it. Only the two requests that are
 * meant to succeed actually send mail.
 *
 * Needs MONGODB_URI, so run it with the backend's env file, and TEST_EMAIL set
 * to an existing account on a real inbox — two of the checks send actual mail:
 *   TEST_EMAIL=you@example.com node --env-file=.env scripts/test-password-reset.js [baseUrl]
 *
 * The address is not hardcoded so a personal inbox does not end up in the
 * repository.
 */
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { hashCode } from '../utils/passwordReset.js';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const TEST_EMAIL = process.env.TEST_EMAIL;

if (!TEST_EMAIL) {
  console.error('Set TEST_EMAIL to an existing account, e.g. TEST_EMAIL=you@example.com node --env-file=.env scripts/test-password-reset.js');
  process.exit(1);
}

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const post = async (path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
};

const minutes = (n) => n * 60 * 1000;

await mongoose.connect(process.env.MONGODB_URI);

const load = () => User.findOne({ email: TEST_EMAIL });
const setReset = (reset) => User.updateOne({ email: TEST_EMAIL }, { $set: { passwordReset: reset } });

if (!(await load())) {
  console.error(`No account with email ${TEST_EMAIL}. Set TEST_EMAIL to an existing account.`);
  await mongoose.disconnect();
  process.exit(1);
}

const atCap = {
  codeHash: hashCode('111111'),
  expiresAt: new Date(Date.now() + minutes(10)),
  attemptCount: 0,
  requestCount: 3,
  windowStartedAt: new Date(),
  verifiedAt: null,
};

console.log('Rate limit (3 codes per 15 minutes):');
await setReset(atCap);
const capped = await post('/auth/forgot-password', { identifier: TEST_EMAIL });
const afterCap = await load();
check('a request over the cap still answers 200', capped.status === 200);
check('no new code is issued while capped', afterCap.passwordReset.codeHash === atCap.codeHash);
check('the counter does not climb past the cap', afterCap.passwordReset.requestCount === 3, String(afterCap.passwordReset.requestCount));

await setReset({ ...atCap, windowStartedAt: new Date(Date.now() - minutes(16)) });
const rolled = await post('/auth/forgot-password', { identifier: TEST_EMAIL });
const afterRoll = await load();
check('a fresh window allows sending again', rolled.status === 200 && afterRoll.passwordReset.codeHash !== atCap.codeHash);
check('the counter restarts in the new window', afterRoll.passwordReset.requestCount === 1, String(afterRoll.passwordReset.requestCount));

console.log('\nAttempt budget (5 guesses):');
await setReset({ codeHash: hashCode('222222'), expiresAt: new Date(Date.now() + minutes(10)), attemptCount: 0, requestCount: 1, windowStartedAt: new Date(), verifiedAt: null });
for (let i = 0; i < 5; i += 1) {
  await post('/auth/verify-reset-code', { identifier: TEST_EMAIL, code: '999999' });
}
const afterGuesses = await post('/auth/verify-reset-code', { identifier: TEST_EMAIL, code: '222222' });
const burned = await load();
check('the correct code is refused once the budget is spent', afterGuesses.status === 400);
check('the code is burned in the database', burned.passwordReset.codeHash === null);

console.log('\nExpiry:');
await setReset({ codeHash: hashCode('333333'), expiresAt: new Date(Date.now() - 1000), attemptCount: 0, requestCount: 1, windowStartedAt: new Date(), verifiedAt: null });
const expired = await post('/auth/verify-reset-code', { identifier: TEST_EMAIL, code: '333333' });
check('an expired code is rejected', expired.status === 400, expired.data?.message);

console.log('\nAccount enumeration:');
const known = await post('/auth/forgot-password', { identifier: TEST_EMAIL });
const unknownEmail = await post('/auth/forgot-password', { identifier: 'definitely-not-registered@example.com' });
const unknownId = await post('/auth/forgot-password', { identifier: '1999-0001' });
check('an unknown email answers exactly as a known one does',
  unknownEmail.status === known.status && unknownEmail.data?.message === known.data?.message, `both ${known.status}`);
check('an unknown school ID answers the same way',
  unknownId.status === known.status && unknownId.data?.message === known.data?.message);
const unknownVerify = await post('/auth/verify-reset-code', { identifier: 'definitely-not-registered@example.com', code: '123456' });
check('verifying against an unknown account gives the generic code error',
  unknownVerify.status === 400 && /incorrect or has expired/.test(unknownVerify.data?.message ?? ''));

console.log('\nValidation:');
const blank = await post('/auth/forgot-password', { identifier: '   ' });
check('a blank identifier is rejected', blank.status === 400, blank.data?.message);
const malformed = await post('/auth/verify-reset-code', { identifier: TEST_EMAIL, code: '12ab56' });
check('a non-numeric code is rejected', malformed.status === 400);
const shortPassword = await post('/auth/reset-password', { resetToken: 'irrelevant', newPassword: 'abc' });
check('a too-short new password is rejected', shortPassword.status === 400 && /at least 8/.test(shortPassword.data?.message ?? ''));
const badToken = await post('/auth/reset-password', { resetToken: 'not-a-real-token', newPassword: 'longenoughpassword' });
check('an invalid reset token is rejected', badToken.status === 401, badToken.data?.message);

// Leave no reset state behind.
await setReset(null);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
await mongoose.disconnect();
process.exit(failures === 0 ? 0 : 1);
