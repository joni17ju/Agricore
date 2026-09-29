/**
 * Notifications end to end against a running API.
 *
 * Submits a real mission attempt for a real student and checks that the
 * resulting notifications, badge awards and instructor alerts are written —
 * then removes everything it created, so the seeded data is left as it was.
 *
 * Needs MONGODB_URI for setup and cleanup:
 *   node --env-file=.env scripts/test-notifications.js [baseUrl]
 */
import mongoose from 'mongoose';
import { Lesson, Mission, MissionAttempt, Module, Notification, User } from '../models/index.js';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const PASSWORD = 'agricore123';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const call = async (path, { method = 'GET', body, token } = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

const signIn = async (identifier) => {
  const res = await call('/auth/login', { method: 'POST', body: { identifier, password: PASSWORD } });
  if (res.status !== 200) throw new Error(`could not sign in as ${identifier}: ${res.status}`);
  return { token: res.data.token, user: res.data.user };
};

await mongoose.connect(process.env.MONGODB_URI);

/*
 * A throwaway student in a real section, so the test never disturbs a seeded
 * account's badges, attempts or stats.
 */
const section = await User.findOne({ role: 'student', sectionId: { $ne: null } }).select('sectionId');
const created = await User.create({
  role: 'student',
  firstName: 'Notify',
  lastName: 'Probe',
  email: 'notify.probe@dorsu.edu.ph',
  // Same bcrypt hash the seed uses for PASSWORD.
  passwordHash: (await User.findOne({ email: 'juan.delacruz@dorsu.edu.ph' }).select('passwordHash')).passwordHash,
  schoolId: '2024-9099',
  sectionId: section.sectionId,
  status: 'active',
  earnedBadges: [],
});
console.log(`test student: ${created.email}\n`);

const cleanup = async () => {
  await MissionAttempt.deleteMany({ studentId: created._id });
  await Notification.deleteMany({ 'meta.studentId': String(created._id) });
  await Notification.deleteMany({ userId: created._id });
  await User.deleteOne({ _id: created._id });
  await mongoose.disconnect();
};

try {
  const student = await signIn(created.email);

  // ── An empty inbox to begin with ──
  console.log('Starting state:');
  const empty = await call('/notifications', { token: student.token });
  check('new account has no notifications', empty.status === 200 && empty.data.notifications.length === 0);
  check('unread count is zero', empty.data.unreadCount === 0, `${empty.data.unreadCount}`);

  // ── Submit a real, passing mission attempt ──
  console.log('\nAfter passing a mission:');
  const module1 = await Module.findOne({ moduleNumber: 1 });
  const lesson = await Lesson.findOne({ moduleId: module1._id }).sort({ lessonNumber: 1 });
  const mission = await Mission.findOne({ lessonId: lesson._id });

  /*
   * Pick the highest-scoring choice for every scenario, in the shape the
   * decision-making scorer expects: { choices: { [scenarioId]: choiceId } }.
   * The server re-scores from stored scenarioData whatever is sent, so these
   * have to be genuinely the best answers rather than merely claimed.
   */
  const choices = {};
  for (const scenario of mission.scenarioData?.scenarios ?? []) {
    const best = [...scenario.choices].sort((a, b) => b.points - a.points)[0];
    choices[scenario.id] = best.id;
  }
  const answers = { choices };

  const submit = await call('/missionAttempts', {
    method: 'POST',
    token: student.token,
    body: { studentId: student.user._id, missionId: String(mission._id), answers, timeSpentSeconds: 40 },
  });
  check('attempt accepted', submit.status === 201, `${submit.status}`);
  console.log(`         scored ${submit.data?.score}%, passed=${submit.data?.isPassed}, badges=${JSON.stringify(submit.data?.newBadges)}`);

  const after = await call('/notifications', { token: student.token });
  const types = after.data.notifications.map((n) => n.type);
  check('notifications were created', after.data.notifications.length > 0, types.join(', '));
  check('unread count matches the rows', after.data.unreadCount === after.data.notifications.filter((n) => !n.isRead).length);

  if (submit.data?.isPassed) {
    check('a mission-passed notification exists', types.includes('mission-passed'), types.join(', '));
    check('a badge was awarded server side', (submit.data.newBadges ?? []).length > 0, JSON.stringify(submit.data.newBadges));
    check('a badge-earned notification exists', types.includes('badge-earned'), types.join(', '));

    const stored = await User.findById(created._id).select('earnedBadges');
    check('the badge was persisted on the user', stored.earnedBadges.length > 0,
      stored.earnedBadges.map((b) => b.code).join(', '));
  } else {
    check('mission was expected to pass', false, `scored ${submit.data?.score}`);
  }

  // ── A replay must not notify again ──
  console.log('\nReplaying the same mission:');
  const before = (await call('/notifications', { token: student.token })).data.notifications.length;
  await call('/missionAttempts', {
    method: 'POST',
    token: student.token,
    body: { studentId: student.user._id, missionId: String(mission._id), answers, timeSpentSeconds: 42 },
  });
  const replayed = (await call('/notifications', { token: student.token })).data.notifications.length;
  check('a replay creates no new mission-passed notification', replayed === before, `${before} -> ${replayed}`);

  // ── Marking read ──
  console.log('\nMarking read:');
  const list = await call('/notifications', { token: student.token });
  const first = list.data.notifications[0];
  const marked = await call(`/notifications/${first._id}/read`, { method: 'PATCH', token: student.token });
  check('marking one read succeeds', marked.status === 200 && marked.data.notification.isRead === true);
  check('unread count drops by one', marked.data.unreadCount === list.data.unreadCount - 1,
    `${list.data.unreadCount} -> ${marked.data.unreadCount}`);

  const all = await call('/notifications/read-all', { method: 'PATCH', token: student.token });
  check('mark-all-as-read succeeds', all.status === 200 && all.data.unreadCount === 0, `${all.data.unreadCount}`);
  const countAfter = await call('/notifications/unread-count', { token: student.token });
  check('unread-count endpoint agrees', countAfter.data.unreadCount === 0);

  // ── Scoping: one user cannot touch another's rows ──
  console.log('\nScoping:');
  const instructor = await signIn('c.reyes@dorsu.edu.ph');
  const theirs = await call('/notifications', { token: instructor.token });
  const leaked = theirs.data.notifications.filter((n) => String(n.userId) === String(created._id));
  check('another user does not see this student\'s rows', leaked.length === 0, `${leaked.length} leaked`);
  const crossRead = await call(`/notifications/${first._id}/read`, { method: 'PATCH', token: instructor.token });
  check('another user cannot mark this student\'s row read', crossRead.status === 404, `${crossRead.status}`);
  const anon = await call('/notifications');
  check('unauthenticated access is refused', anon.status === 401, `${anon.status}`);

  // ── The instructor side ──
  console.log('\nInstructor notifications:');
  const instructorRows = theirs.data.notifications;
  check('instructor endpoint works', theirs.status === 200, `${instructorRows.length} rows`);
  const joined = await Notification.findOne({
    userId: instructor.user._id,
    type: 'student-joined',
  }).sort({ createdAt: -1 });
  console.log(`         most recent student-joined: ${joined ? joined.title : '(none yet)'}`);
} finally {
  await cleanup();
  console.log('\ntest data removed');
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
