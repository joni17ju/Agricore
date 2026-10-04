/**
 * The two-role model: student approval, instructor management powers, and the
 * safety rules that stop the instructor role being used against itself.
 *
 * Creates everything it needs and removes it again, so seeded accounts are
 * left exactly as they were.
 *
 *   node --env-file=.env scripts/test-roles.js [baseUrl]
 */
import mongoose from 'mongoose';
import { Notification, Section, User } from '../models/index.js';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const PASSWORD = 'agricore123';
const INSTRUCTOR = 'c.reyes@dorsu.edu.ph';
const OTHER_INSTRUCTOR = 'a.villanueva@dorsu.edu.ph';
const SEEDED_STUDENT = 'juan.delacruz@dorsu.edu.ph';

const stamp = Date.now();
const NEW_STUDENT = {
  firstName: 'Rolecheck',
  lastName: 'Probe',
  email: `rolecheck.${stamp}@dorsu.edu.ph`,
  schoolId: `2024-${String(stamp).slice(-4)}`,
  password: 'rolecheckPass2026',
};

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
  if (res.status !== 200) throw new Error(`could not sign in as ${identifier}: ${res.status} ${JSON.stringify(res.data)}`);
  return { token: res.data.token, user: res.data.user };
};

await mongoose.connect(process.env.MONGODB_URI);
const createdIds = [];
const createdSectionIds = [];

try {
  const instructor = await signIn(INSTRUCTOR);
  const other = await signIn(OTHER_INSTRUCTOR);
  const sections = await call('/sections/options');
  const sectionId = sections.data[0]._id;

  // ── Registration ──
  console.log('Registration:');
  const registered = await call('/auth/register', {
    method: 'POST',
    body: { ...NEW_STUDENT, role: 'student', sectionId },
  });
  check('a student can register', registered.status === 201, `${registered.status}`);
  check('no token is issued', registered.data?.token === null);
  check('flagged as requiring approval', registered.data?.requiresApproval === true);
  check('created as pending', registered.data?.user?.status === 'pending', registered.data?.user?.status);
  if (registered.data?.user?._id) createdIds.push(registered.data.user._id);

  const asInstructor = await call('/auth/register', {
    method: 'POST',
    body: { firstName: 'No', lastName: 'Way', email: `inst.${stamp}@dorsu.edu.ph`, password: PASSWORD, role: 'instructor' },
  });
  check('registering as an instructor is refused', asInstructor.status === 403, `${asInstructor.status}`);
  const asAdmin = await call('/auth/register', {
    method: 'POST',
    body: { firstName: 'No', lastName: 'Way', email: `adm.${stamp}@dorsu.edu.ph`, password: PASSWORD, role: 'admin' },
  });
  check('registering as an admin is refused', asAdmin.status === 403, `${asAdmin.status}`);

  // ── Pending sign-in ──
  console.log('\nPending sign-in:');
  const pendingLogin = await call('/auth/login', {
    method: 'POST',
    body: { identifier: NEW_STUDENT.email, password: NEW_STUDENT.password },
  });
  check('a pending student cannot sign in', pendingLogin.status === 403, `${pendingLogin.status}`);
  check('and is told why', /waiting for approval/i.test(pendingLogin.data?.message ?? ''), pendingLogin.data?.message);

  // ── The instructor sees the request ──
  console.log('\nAccount request:');
  const queue = await call('/users?role=student&status=pending', { token: instructor.token });
  check('request appears in the pending list', queue.status === 200 && queue.data.some((u) => u.email === NEW_STUDENT.email),
    `${queue.data?.length ?? 0} pending`);
  const notified = await Notification.findOne({ userId: instructor.user._id, type: 'account-request' }).sort({ createdAt: -1 });
  check('instructor was notified', Boolean(notified), notified?.title ?? 'none');

  // ── Approval ──
  console.log('\nApproval:');
  const student = queue.data.find((u) => u.email === NEW_STUDENT.email);
  const approved = await call(`/users/${student._id}`, { method: 'PATCH', token: instructor.token, body: { status: 'active' } });
  check('instructor can approve', approved.status === 200 && approved.data.status === 'active', `${approved.status}`);
  const afterLogin = await call('/auth/login', {
    method: 'POST',
    body: { identifier: NEW_STUDENT.email, password: NEW_STUDENT.password },
  });
  check('the student can now sign in', afterLogin.status === 200, `${afterLogin.status}`);
  const approvalNote = await Notification.findOne({ userId: student._id, type: 'account-approved' });
  check('the student was notified of approval', Boolean(approvalNote), approvalNote?.title ?? 'none');

  const studentToken = afterLogin.data.token;

  // ── Students are locked out of every management route ──
  console.log('\nStudent is refused on instructor-only routes:');
  const forbidden = [
    ['GET', '/users'],
    ['POST', '/users'],
    ['DELETE', `/users/${student._id}`],
    ['POST', '/sections'],
    ['PATCH', `/sections/${sectionId}`],
    ['DELETE', `/sections/${sectionId}`],
    ['POST', '/modules'],
    ['POST', '/lessons'],
    ['POST', '/missions'],
  ];
  for (const [method, path] of forbidden) {
    const res = await call(path, { method, token: studentToken, body: method === 'GET' ? undefined : {} });
    check(`${method} ${path}`, res.status === 403, `${res.status}`);
  }

  // ── Instructor management ──
  console.log('\nInstructor management:');
  const added = await call('/users', {
    method: 'POST',
    token: instructor.token,
    body: { role: 'student', firstName: 'Added', lastName: 'Directly', email: `added.${stamp}@dorsu.edu.ph`, schoolId: `2024-${String(stamp).slice(-4)}1`, sectionId },
  });
  check('instructor can add a student', added.status === 201 && added.data.status === 'active', `${added.status}`);
  if (added.data?._id) createdIds.push(added.data._id);

  const addedInstructor = await call('/users', {
    method: 'POST',
    token: instructor.token,
    body: { role: 'instructor', firstName: 'Nope', lastName: 'Nope', email: `nope.${stamp}@dorsu.edu.ph` },
  });
  check('instructor cannot create another instructor', addedInstructor.status === 403, `${addedInstructor.status}`);

  const moved = await call(`/users/${added.data._id}`, {
    method: 'PATCH',
    token: instructor.token,
    body: { sectionId: sections.data[1]?._id ?? sectionId },
  });
  check('instructor can move a student between sections', moved.status === 200, `${moved.status}`);

  const deactivated = await call(`/users/${added.data._id}`, { method: 'PATCH', token: instructor.token, body: { status: 'inactive' } });
  check('instructor can deactivate a student', deactivated.status === 200 && deactivated.data.status === 'inactive');
  const reactivated = await call(`/users/${added.data._id}`, { method: 'PATCH', token: instructor.token, body: { status: 'active' } });
  check('instructor can reactivate a student', reactivated.status === 200 && reactivated.data.status === 'active');

  const promoted = await call(`/users/${added.data._id}`, { method: 'PATCH', token: instructor.token, body: { role: 'instructor' } });
  check('a student cannot be promoted to instructor', promoted.status === 403, `${promoted.status}`);

  // ── Safety rules ──
  console.log('\nSafety rules:');
  const selfDeactivate = await call(`/users/${instructor.user._id}`, { method: 'PATCH', token: instructor.token, body: { status: 'inactive' } });
  check('instructor cannot deactivate themselves', selfDeactivate.status === 403, `${selfDeactivate.status}`);
  const selfDelete = await call(`/users/${instructor.user._id}`, { method: 'DELETE', token: instructor.token });
  check('instructor cannot delete themselves', selfDelete.status === 403, `${selfDelete.status}`);
  const otherEdit = await call(`/users/${other.user._id}`, { method: 'PATCH', token: instructor.token, body: { firstName: 'Hijacked' } });
  check('instructor cannot edit another instructor', otherEdit.status === 403, `${otherEdit.status}`);
  const otherDelete = await call(`/users/${other.user._id}`, { method: 'DELETE', token: instructor.token });
  check('instructor cannot delete another instructor', otherDelete.status === 403, `${otherDelete.status}`);
  const selfProfile = await call(`/users/${instructor.user._id}`, { method: 'PATCH', token: instructor.token, body: { avatarUrl: null } });
  check('instructor can still edit their own profile', selfProfile.status === 200, `${selfProfile.status}`);
  const studentSelfEdit = await call(`/users/${student._id}`, { method: 'PATCH', token: studentToken, body: { avatarUrl: null } });
  check('a student can still edit their own profile', studentSelfEdit.status === 200, `${studentSelfEdit.status}`);
  const studentEditsOther = await call(`/users/${added.data._id}`, { method: 'PATCH', token: studentToken, body: { firstName: 'Nope' } });
  check('a student cannot edit another account', studentEditsOther.status === 403, `${studentEditsOther.status}`);

  // ── Sections ──
  console.log('\nSections:');
  const createdSection = await call('/sections', { method: 'POST', token: instructor.token, body: { sectionName: `Probe ${stamp}` } });
  check('instructor can create a section', createdSection.status === 201, `${createdSection.status}`);
  if (createdSection.data?._id) createdSectionIds.push(createdSection.data._id);
  const renamed = await call(`/sections/${createdSection.data._id}`, { method: 'PATCH', token: instructor.token, body: { sectionName: `Probe ${stamp} renamed` } });
  check('instructor can rename a section', renamed.status === 200 && renamed.data.sectionName.endsWith('renamed'));
  const occupied = await call(`/sections/${sectionId}`, { method: 'DELETE', token: instructor.token });
  check('a section with students cannot be deleted', occupied.status === 409, `${occupied.status}`);
  check('and the refusal explains why', /enrolled/i.test(occupied.data?.message ?? ''), occupied.data?.message);
  const removed = await call(`/sections/${createdSection.data._id}`, { method: 'DELETE', token: instructor.token });
  check('an empty section can be deleted', removed.status === 200, `${removed.status}`);
  if (removed.status === 200) createdSectionIds.pop();

  // ── Deleting a student ──
  console.log('\nDeleting a student:');
  const deleted = await call(`/users/${added.data._id}`, { method: 'DELETE', token: instructor.token });
  check('instructor can delete a student', deleted.status === 200, `${deleted.status}`);
  if (deleted.status === 200) createdIds.splice(createdIds.indexOf(added.data._id), 1);

  // ── Seeded students are untouched ──
  console.log('\nSeeded data:');
  const seeded = await User.findOne({ email: SEEDED_STUDENT }).select('status');
  check('seeded students are still active', seeded.status === 'active', seeded.status);
  const anyAdmin = await mongoose.connection.db.collection('users').countDocuments({ role: 'admin' });
  console.log(`         admin accounts still in the database: ${anyAdmin} (removed by scripts/remove-admin-role.js)`);
} finally {
  if (createdIds.length) await User.deleteMany({ _id: { $in: createdIds } });
  if (createdIds.length) await Notification.deleteMany({ userId: { $in: createdIds } });
  await Notification.deleteMany({ type: 'account-request', 'meta.studentId': { $in: createdIds.map(String) } });
  if (createdSectionIds.length) await Section.deleteMany({ _id: { $in: createdSectionIds } });
  await mongoose.disconnect();
  console.log('\ntest data removed');
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
