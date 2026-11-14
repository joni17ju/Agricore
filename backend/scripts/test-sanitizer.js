/**
 * Lesson content sanitising: the colour rules and the allow-list.
 *
 * Part 1 runs sanitizeLessonHtml directly against malicious and legitimate
 * samples. Part 2 sends crafted content through the real save endpoint
 * (PATCH /api/lessons/:id) as Prof. Reyes, to prove the server — not just the
 * editor — strips it. The lesson's original title and content are then written
 * back directly with Mongoose: the endpoint now sanitises, so restoring through
 * it could not guarantee the original bytes.
 *
 * Usage: node --env-file=.env scripts/test-sanitizer.js [baseUrl]
 *        (part 2 needs a running API and MONGODB_URI)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { normalizeCssColor, sanitizeColorStyle } from '../utils/cssColor.js';
import { sanitizeLessonHtml } from '../utils/lessonHtml.js';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const INSTRUCTOR = { email: 'c.reyes@dorsu.edu.ph', password: 'agricore123' };

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const same = (label, got, want) => check(label, got === want, got === want ? '' : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ── Part 1: the rules on their own ──
console.log('Colour values:');
same('hex6 is lowercased', normalizeCssColor('#FDE9B0'), '#fde9b0');
same('hex3 is expanded', normalizeCssColor('#F0A'), '#ff00aa');
same('rgb() becomes hex', normalizeCssColor('rgb(198, 40, 40)'), '#c62828');
same('rgba() alpha is dropped', normalizeCssColor('rgba(198, 40, 40, 0.5)'), '#c62828');
for (const bad of ['red', 'transparent', 'rgb(256,0,0)', 'rgb(10%,0,0)', 'url(x)', 'var(--a)', 'expression(1)', '#ggg', '#ffff', '#' + 'f'.repeat(5000)]) {
  same(`rejects ${bad.slice(0, 24)}`, normalizeCssColor(bad), null);
}

console.log('\nStyle attributes:');
same('span keeps one colour declaration', sanitizeColorStyle('SPAN', 'color:#C62828;'), 'color: #c62828');
same('mark keeps one background declaration', sanitizeColorStyle('MARK', 'background-color: rgb(253,233,176)'), 'background-color: #fde9b0');
const rejectedStyles = [
  ['SPAN', 'color: url(javascript:alert(1))'],
  ['MARK', 'background-color: url("javascript:alert(1)")'],
  ['SPAN', 'color: expression(alert(1))'],
  ['SPAN', 'color: var(--anything)'],
  ['SPAN', 'color: #fff; position: fixed; inset: 0'],
  ['SPAN', 'color: #fff; background-image: url(https://evil.test/x.png)'],
  ['SPAN', 'color: #000; color: #fff'],
  ['SPAN', 'color: #fff !important'],
  ['SPAN', String.raw`col\6fr: #fff`],
  ['SPAN', 'color: /**/#fff'],
  ['SPAN', 'background-color: #fff'],
  ['MARK', 'color: #fff'],
  ['MARK', 'background: #fff'],
  ['P', 'color: #fff'],
  ['A', 'color: #fff'],
  ['SPAN', `color: #fff;${' '.repeat(200)}`],
  ['SPAN', 'color: red'],
];
for (const [tag, style] of rejectedStyles) same(`${tag} rejects "${style.slice(0, 44)}"`, sanitizeColorStyle(tag, style), null);

console.log('\nWhole documents:');
const samples = [
  ['style with url(javascript:) is removed', '<p><span style="color: url(javascript:alert(1))">x</span></p>', '<p><span>x</span></p>'],
  ['style with expression() is removed', '<p><mark style="background-color: expression(alert(1))">x</mark></p>', '<p><mark>x</mark></p>'],
  ['chained extra properties remove the whole style', '<p><span style="color: #c62828; position: fixed; top: 0">x</span></p>', '<p><span>x</span></p>'],
  ['style on a disallowed tag is removed', '<p style="color: #c62828">x</p>', '<p>x</p>'],
  ['oversized style is removed', `<p><span style="color: #c62828;${' '.repeat(5000)}">x</span></p>`, '<p><span>x</span></p>'],
  ['valid colours are kept and normalised', '<p><span style="color:#C62828"><mark style="background-color: rgb(253, 233, 176)">x</mark></span></p>', '<p><span style="color: #c62828"><mark style="background-color: #fde9b0">x</mark></span></p>'],
  ['legacy data-color highlights are kept exactly', '<p><mark data-color="amber">x</mark><mark data-color="green">y</mark></p>', '<p><mark data-color="amber">x</mark><mark data-color="green">y</mark></p>'],
  ['an unknown data-color is removed', '<p><mark data-color="javascript:alert(1)">x</mark></p>', '<p><mark>x</mark></p>'],
  ['event handlers are removed', '<p onclick="alert(1)"><span onmouseover="alert(1)" style="color: #000">x</span></p>', '<p><span style="color: #000000">x</span></p>'],
  ['scripts are dropped with their contents', '<p>a<script>alert(1)</script>b</p>', '<p>ab</p>'],
  ['style elements are dropped with their contents', '<style>p{color:red}</style><p>x</p>', '<p>x</p>'],
  ['iframes are unwrapped', '<iframe src="https://evil.test"></iframe><p>x</p>', '<p>x</p>'],
  ['javascript: links lose their href', '<p><a href="javascript:alert(1)">x</a></p>', '<p><a>x</a></p>'],
  ['Object.prototype names are not attributes', '<p constructor="x" tostring="y" valueof="z" hasownproperty="w">x</p>', '<p>x</p>'],
  ['comments are dropped', '<p>a<!-- <script>alert(1)</script> -->b</p>', '<p>ab</p>'],
  ['a div that is not a callout or video is unwrapped', '<div class="x"><p>x</p></div>', '<p>x</p>'],
  ['a video placeholder with a bad id is dropped', '<div data-video="youtube" data-id="&quot;onload=x">y</div><p>z</p>', '<p>z</p>'],
  ['an image without a safe src is dropped', '<p>a</p><img src="javascript:alert(1)" alt="x"><p>b</p>', '<p>a</p><p>b</p>'],
  ['non-string input becomes empty', sanitizeLessonHtml({ toString: () => '<script>x</script>' }) === '' ? '' : 'x', ''],
];
for (const [label, input, expected] of samples) {
  same(label, typeof input === 'string' && input.startsWith('<') ? sanitizeLessonHtml(input) : input, expected);
}

// Legitimate content from the editor must come back byte-for-byte, or every
// save would quietly rewrite lessons.
const legit =
  '<h2 data-align="center">Pests — and “why” it matters</h2><p>Text&nbsp;with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, ' +
  '<a href="https://example.com/a?b=1&amp;c=2">a link</a> and <span style="color: #c62828"><mark style="background-color: #fde9b0">both colours</mark></span>.</p>' +
  '<ul><li><p>one</p></li></ul><div data-callout="tip"><p>Tip &lt;3</p></div><hr><img src="https://x.test/a.png" alt="say &quot;hi&quot;" data-layout="center">' +
  '<div data-video="youtube" data-id="dQw4w9WgXcQ"></div>';
same('legitimate editor output is unchanged', sanitizeLessonHtml(legit), legit);
same('sanitising is idempotent', sanitizeLessonHtml(sanitizeLessonHtml(legit)), legit);

// ── Part 2: through the save endpoint ──
console.log(`\nThrough the API (${BASE}):`);
async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

let api = null;
try {
  api = await call('/health');
} catch {
  api = null;
}
if (!api || api.status !== 200) {
  console.log('  SKIP  API not reachable — part 2 needs a running server');
} else {
  const { data: auth } = await call('/auth/login', { method: 'POST', body: INSTRUCTOR });
  const token = auth.token;
  const lessons = (await call('/lessons', { token })).data;
  const target = lessons[0];

  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.db.collection('lessons');
  const original = await collection.findOne({ _id: target._id ? new mongoose.Types.ObjectId(String(target._id)) : null });
  check('found the lesson to test with', Boolean(original), original?.title);

  try {
    const crafted =
      '<p onclick="alert(1)">Crafted ' +
      '<span style="color: url(javascript:alert(1))">a</span> ' +
      '<span style="color: #c62828; position: fixed; inset: 0">b</span> ' +
      '<mark style="background-color: expression(alert(1))">c</mark> ' +
      '<span style="color: #C62828">ok</span> <mark style="background-color: rgb(253, 233, 176)">ok</mark>' +
      '<script>alert(1)</script></p>';
    const saved = await call(`/lessons/${target._id}`, { method: 'PATCH', token, body: { contentBody: crafted } });
    check('crafted save is accepted (and cleaned, not rejected)', saved.status === 200, `${saved.status}`);
    const stored = (await collection.findOne({ _id: original._id })).contentBody;
    same(
      'only the valid colours survive, normalised',
      stored,
      '<p>Crafted <span>a</span> <span>b</span> <mark>c</mark> <span style="color: #c62828">ok</span> <mark style="background-color: #fde9b0">ok</mark></p>',
    );
    check('no url(), expression(), handler or script reached the database', !/url\(|expression\(|onclick|<script|position/i.test(stored));

    const notString = await call(`/lessons/${target._id}`, { method: 'PATCH', token, body: { contentBody: { $gt: '' } } });
    check('a non-string contentBody is refused', notString.status === 400, `${notString.status}`);
  } finally {
    // Original bytes back, whatever happened above.
    await collection.updateOne(
      { _id: original._id },
      { $set: { title: original.title, contentBody: original.contentBody, updatedAt: original.updatedAt } },
    );
    const restored = await collection.findOne({ _id: original._id });
    check(
      'lesson restored byte-for-byte',
      restored.contentBody === original.contentBody && restored.title === original.title,
      `${restored.contentBody.length} chars`,
    );
    await mongoose.disconnect();
  }
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
