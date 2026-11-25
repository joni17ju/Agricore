/**
 * After the cut-off, a submission without an attempt id (the old duplicate-tab
 * path) is refused. Its own file, so the env var is read before the app loads.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.LEGACY_ATTEMPTS_UNTIL = '2000-01-01T00:00:00Z';
const { seedFixture, startTestServer } = await import('./helpers.js');

let ctx;
let fx;
before(async () => {
  ctx = await startTestServer();
  fx = await seedFixture(ctx);
});
after(async () => {
  await ctx?.stop();
});

test('a submission without an attempt id is refused after the cut-off', async () => {
  const result = await ctx.call('POST', '/missionAttempts', {
    token: fx.tokens.ana,
    body: { studentId: fx.ana._id, missionId: fx.mission._id, answers: { choices: { s1: 'good' } } },
  });
  assert.equal(result.status, 428);
  assert.equal(result.body.code, 'attempt_required');
  assert.equal(await ctx.models.MissionAttempt.countDocuments(), 0);
});
