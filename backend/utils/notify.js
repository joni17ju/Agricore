import { Notification, NOTIFICATION_TYPES, User } from '../models/index.js';

/**
 * Creating notifications.
 *
 * Every notification in the app is written through here, from a server-side
 * event. There is deliberately no create endpoint: a client that can post its
 * own notifications is a client that can lie to the person reading them.
 *
 * Delivery is best-effort. A notification is a side effect of something that
 * already succeeded — a mission was scored, an account was approved — so a
 * failure to write one must never fail that action. Errors are logged and
 * swallowed; the caller's own response is unaffected.
 */

async function create(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return [];
  try {
    return await Notification.insertMany(list, { ordered: false });
  } catch (error) {
    console.error('[notify] could not write notification(s)', error.message);
    return [];
  }
}

/** Instructors assigned to a section, used to route student events. */
async function instructorsForSection(sectionId) {
  if (!sectionId) return [];
  try {
    return await User.find({
      role: 'instructor',
      status: 'active',
      assignedSectionIds: sectionId,
    }).select('_id');
  } catch (error) {
    console.error('[notify] could not resolve section instructors', error.message);
    return [];
  }
}

/** Every instructor who can act on an account request. */
async function activeInstructors() {
  try {
    return await User.find({ role: 'instructor', status: 'active' }).select('_id');
  } catch (error) {
    console.error('[notify] could not resolve instructors', error.message);
    return [];
  }
}

/** A student earned one or more badges. */
export function notifyBadgesEarned(student, badges) {
  return create(
    badges.map((badge) => ({
      userId: student._id,
      type: NOTIFICATION_TYPES.BADGE_EARNED,
      title: `Badge earned: ${badge.name}`,
      body: badge.description,
      link: '/student/achievements',
      meta: { badgeCode: badge.code, icon: badge.icon },
    })),
  );
}

/**
 * First time a student passes a given mission — replays do not notify.
 *
 * A mission has no title column of its own; the name shown in the game lives
 * in scenarioData, so fall back to the lesson and level if it is missing.
 */
export function notifyMissionPassed(student, { mission, lesson, module, score, xpEarned }) {
  const name = mission.scenarioData?.title || `${lesson?.title ?? 'Mission'} · Level ${mission.levelNumber}`;
  return create({
    userId: student._id,
    type: NOTIFICATION_TYPES.MISSION_PASSED,
    title: `Mission passed: ${name}`,
    body: `${module.title} · scored ${score}%${xpEarned > 0 ? ` · +${xpEarned} XP` : ''}`,
    link: '/student/missions',
    meta: { missionId: String(mission._id), score, xpEarned },
  });
}

/** Every mission in every lesson of a module now has a passing attempt. */
export function notifyModuleCleared(student, module) {
  return create({
    userId: student._id,
    type: NOTIFICATION_TYPES.MODULE_CLEARED,
    title: `Module ${module.moduleNumber} cleared`,
    body: `You have finished every mission in ${module.title}.`,
    link: '/student/modules',
    meta: { moduleId: String(module._id), moduleNumber: module.moduleNumber },
  });
}

/**
 * A student has just crossed into at-risk. Sent to the instructors of their
 * section, not to the student — being told you are "at risk" by a bell is not
 * how that conversation should start.
 */
export async function notifyStudentAtRisk(student, { reason, averageScore }) {
  const instructors = await instructorsForSection(student.sectionId);
  return create(
    instructors.map((instructor) => ({
      userId: instructor._id,
      type: NOTIFICATION_TYPES.STUDENT_AT_RISK,
      title: `${student.firstName} ${student.lastName} may need support`,
      body: reason,
      link: '/instructor/performance',
      meta: { studentId: String(student._id), averageScore },
    })),
  );
}

/**
 * A student registered and is waiting to be approved.
 *
 * Goes to every active instructor, not only those assigned to the chosen
 * section: a section with no assigned instructor would otherwise leave the
 * request invisible, and the account would sit pending forever.
 */
export async function notifyAccountRequest(student, section) {
  const instructors = await activeInstructors();
  return create(
    instructors.map((instructor) => ({
      userId: instructor._id,
      type: NOTIFICATION_TYPES.ACCOUNT_REQUEST,
      title: 'New account request',
      body: `${student.firstName} ${student.lastName} signed up for ${section?.sectionName ?? 'a section'} and is waiting for approval.`,
      link: '/instructor/requests',
      meta: { studentId: String(student._id) },
    })),
  );
}


/** An instructor approved a pending account. */
export function notifyAccountApproved(user) {
  return create({
    userId: user._id,
    type: NOTIFICATION_TYPES.ACCOUNT_APPROVED,
    title: 'Your account was approved',
    body: 'You can sign in now and start working through the course.',
    link: '/student',
    meta: {},
  });
}
