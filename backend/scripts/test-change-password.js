/**
 * Verifies the change-password endpoint end to end against a running API.
 *
 * It changes a demo account's password and puts it back, asserting at each
 * step that a wrong current password is refused and that the old password
 * genuinely stops working once changed.
 *
 * Usage: node scripts/test-change-password.js [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const EMAIL = 'juan.delacruz@dorsu.edu.ph';
const ORIGINAL = 'agricore123';
const TEMP = 'temporary-pass-9876';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const login = (password) => call('/auth/login', { method: 'POST', body: { email: EMAIL, password } });
const change = (token, currentPassword, newPassword) =>
  call('/auth/change-password', { method: 'PATCH', token, body: { currentPassword, newPassword } });

console.log(`Change-password checks for ${EMAIL}\n`);

const first = await login(ORIGINAL);
check('sign in with the original password', first.status === 200, `${first.status}`);
if (first.status !== 200) {
  console.log('\nCannot continue without a session.');
  process.exit(1);
}
const token = first.data.token;

console.log('\nRejections:');
const noAuth = await call('/auth/change-password', { method: 'PATCH', body: { currentPassword: ORIGINAL, newPassword: TEMP } });
check('no token → 401', noAuth.status === 401, `${noAuth.status}`);

const wrong = await change(token, 'not-my-password', TEMP);
check('wrong current password → 401', wrong.status === 401, `"${wrong.data?.message}"`);

const short = await change(token, ORIGINAL, 'short');
check('new password under 8 chars → 400', short.status === 400, `"${short.data?.message}"`);

const same = await change(token, ORIGINAL, ORIGINAL);
check('new password same as current → 400', same.status === 400, `"${same.data?.message}"`);

const missing = await change(token, '', TEMP);
check('missing current password → 400', missing.status === 400, `"${missing.data?.message}"`);

// The decisive check: after all those refusals the password must be untouched.
const stillWorks = await login(ORIGINAL);
check('original password still works after refusals', stillWorks.status === 200, `${stillWorks.status}`);

console.log('\nSuccessful change:');
const changed = await change(token, ORIGINAL, TEMP);
check('correct current password → 200', changed.status === 200, JSON.stringify(changed.data));

const oldRejected = await login(ORIGINAL);
check('old password now rejected', oldRejected.status === 401, `${oldRejected.status}`);

const newAccepted = await login(TEMP);
check('new password works', newAccepted.status === 200, `${newAccepted.status}`);

console.log('\nRestore:');
if (newAccepted.status === 200) {
  const restored = await change(newAccepted.data.token, TEMP, ORIGINAL);
  check('changed back to the demo password', restored.status === 200, `${restored.status}`);
  const finalLogin = await login(ORIGINAL);
  check('demo password works again', finalLogin.status === 200, `${finalLogin.status}`);
} else {
  check('changed back to the demo password', false, 'could not sign in with the new password');
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
