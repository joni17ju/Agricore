/**
 * Performance analytics for instructors (Proposal Figs 24, 27) and the
 * administrator overview.
 */
import { BADGES_BY_CODE } from '../constants/badges.js';
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { PERFORMANCE_STATUS } from '../constants/rules.js';
import {
  average,
  computeLessonMastery,
  computeModuleCompletionRates,
  computeStudentMetrics,
  determinePerformanceStatus,
  findBlindspots,
} from '../utils/analytics.js';
import { buildStudentCurriculum } from '../utils/curriculum.js';
import { isBlank } from '../utils/validation.js';
import { api } from './apiClient.js';
import {
  fullName,
  getCourse,
  getMissionContext,
  getSectionStudents,
  getStudentActivity,
  requireInstructorSection,
  requireUser,
} from './serviceContext.js';

const STATUS_SEVERITY = {
  [PERFORMANCE_STATUS.AT_RISK]: 0,
  [PERFORMANCE_STATUS.SUDDEN_DROP]: 1,
  [PERFORMANCE_STATUS.IN_PROGRESS]: 2,
  [PERFORMANCE_STATUS.ON_TRACK]: 3,
};

/** Metrics, statuses and course-level analytics for a group of students. */
async function analyzeStudents(students, course, now = new Date()) {
  // One activity fetch per student, in parallel. Instructors and admins are
  // allowed to read any student's records, so this needs no special scoping.
  const studentData = await Promise.all(
    students.map(async (student) => {
      const { attempts, progress } = await getStudentActivity(student._id);
      const curriculum = buildStudentCurriculum({ ...course, attempts, progress });
      const metrics = computeStudentMetrics({ attempts, curriculum, missionsById: course.missionsById, now });
      return { student, attempts, curriculum, metrics };
    }),
  );

  // Sections are fetched once and looked up locally rather than per student.
  const sectionList = await api.get('/sections');
  const sectionsById = new Map(sectionList.map((section) => [String(section._id), section]));

  // Status is relative to the student's own section average.
  const sectionAverages = new Map();
  for (const sectionId of new Set(students.map((s) => s.sectionId))) {
    const inSection = studentData.filter((row) => row.student.sectionId === sectionId);
    sectionAverages.set(sectionId, average(inSection.map((row) => row.metrics.progressPercent)) ?? 0);
  }

  const rows = studentData.map(({ student, metrics }) => ({
    student,
    section: sectionsById.get(String(student.sectionId)) ?? null,
    metrics,
    status: determinePerformanceStatus(metrics, sectionAverages.get(student.sectionId)),
  }));

  const allAttempts = studentData.flatMap((row) => row.attempts);
  const lessonMastery = computeLessonMastery({ lessons: course.lessons, missions: course.missions, attempts: allAttempts });
  const moduleCompletionRates = computeModuleCompletionRates(studentData.map((row) => row.curriculum));
  const withModule = (entry) => ({ ...entry, module: course.modulesById.get(entry.moduleId) });

  return {
    rows,
    summary: {
      totalStudents: rows.length,
      averageProgress: Math.round(average(rows.map((r) => r.metrics.progressPercent)) ?? 0),
      averageAssessmentScore: Math.round(average(rows.map((r) => r.metrics.overallWeightedScore)) ?? 0),
      averageModuleCompletion: Math.round(average(moduleCompletionRates.map((m) => m.completionRate)) ?? 0),
      atRiskCount: rows.filter((r) => r.status === PERFORMANCE_STATUS.AT_RISK).length,
      suddenDropCount: rows.filter((r) => r.status === PERFORMANCE_STATUS.SUDDEN_DROP).length,
    },
    moduleCompletionRates,
    lessonMastery: lessonMastery.map(withModule),
    blindspots: findBlindspots(lessonMastery).map(withModule),
  };
}

async function instructorStudents(instructorId, sectionId) {
  const instructor = await requireUser(instructorId, ROLES.INSTRUCTOR);
  if (sectionId) {
    await requireInstructorSection(instructorId, sectionId);
    return { instructor, students: await getSectionStudents(sectionId) };
  }
  return {
    instructor,
    students: (await Promise.all((instructor.assignedSectionIds ?? []).map((id) => getSectionStudents(id)))).flat(),
  };
}

const sortBySeverity = (rows) =>
  [...rows].sort(
    (a, b) =>
      STATUS_SEVERITY[a.status] - STATUS_SEVERITY[b.status] ||
      a.student.lastName.localeCompare(b.student.lastName),
  );

/**
 * Instructor dashboard overview.
 * @param {string} instructorId
 * @param {{ sectionId?: string }} options  omit sectionId for all assigned sections
 */
export async function getInstructorDashboard(instructorId, { sectionId } = {}) {
  const { instructor, students } = await instructorStudents(instructorId, sectionId);
  const analysis = await analyzeStudents(students, await getCourse());
  const sections = await Promise.all(
    (instructor.assignedSectionIds ?? []).map((id) => api.get(`/sections/${id}`).catch(() => null)),
  );
  return {
    instructor,
    sections: sections.filter(Boolean),
    selectedSectionId: sectionId ?? null,
    ...analysis,
    rows: sortBySeverity(analysis.rows),
  };
}

/**
 * Student Performance page: mastery heatmap and individual records.
 * @param {{ sectionId?: string, search?: string, status?: string }} filters
 */
export async function getStudentPerformance(instructorId, { sectionId, search, status } = {}) {
  {
    const { instructor, students } = await instructorStudents(instructorId, sectionId);
    const analysis = await analyzeStudents(students, await getCourse());
    const term = search?.trim().toLowerCase();
    const rows = analysis.rows.filter(
      (row) =>
        (!status || row.status === status) &&
        (isBlank(term) ||
          fullName(row.student).toLowerCase().includes(term) ||
          (row.student.schoolId ?? '').toLowerCase().includes(term)),
    );
    return {
      sections: (await Promise.all((instructor.assignedSectionIds ?? []).map((id) => api.get('/sections/' + id).catch(() => null)))).filter(Boolean),
      summary: analysis.summary,
      lessonMastery: analysis.lessonMastery,
      rows: sortBySeverity(rows),
    };
  }
}

/** Full performance history of one student (instructor "view" action). */
export async function getStudentPerformanceDetail(instructorId, studentId) {
  {
    const student = await requireUser(studentId, ROLES.STUDENT);
    await requireInstructorSection(instructorId, student.sectionId);
    const course = await getCourse();
    const peers = await getSectionStudents(student.sectionId, { includeInactive: true });
    const sectionAnalysis = await analyzeStudents(peers, course);
    const row = sectionAnalysis.rows.find((item) => String(item.student._id) === String(studentId));
    const { attempts, progress } = await getStudentActivity(studentId);
    const curriculum = buildStudentCurriculum({ ...course, attempts, progress });

    return {
      ...row,
      modules: curriculum.map((entry) => ({
        module: entry.module,
        state: entry.state,
        completedLessons: entry.completedLessons,
        totalLessons: entry.totalLessons,
        passedLevels: entry.passedLevels,
        totalLevels: entry.totalLevels,
      })),
      attempts: [...attempts]
        .sort((a, b) => String(b.attemptedAt).localeCompare(String(a.attemptedAt)))
        .map((attempt) => {
          const mission = course.missionsById.get(String(attempt.missionId));
          return { attempt, mission, ...(mission ? getMissionContext(mission, course) : {}) };
        }),
      badges: (student.earnedBadges ?? []).map((badge) => ({ ...BADGES_BY_CODE[badge.code], earnedAt: badge.earnedAt })),
    };
  }
}

/** Administrator dashboard counts. */
export async function getAdminOverview() {
  {
    const [users, sections, course] = await Promise.all([api.get('/users'), api.get('/sections'), getCourse()]);
    const count = (predicate) => users.filter(predicate).length;
    const sectionIds = new Set(sections.map((s) => String(s._id)));
    return {
      students: count((u) => u.role === ROLES.STUDENT),
      activeStudents: count((u) => u.role === ROLES.STUDENT && u.status === USER_STATUS.ACTIVE),
      instructors: count((u) => u.role === ROLES.INSTRUCTOR),
      pendingInstructors: users.filter((u) => u.role === ROLES.INSTRUCTOR && u.status === USER_STATUS.PENDING),
      administrators: count((u) => u.role === ROLES.ADMIN),
      inactiveUsers: count((u) => u.status === USER_STATUS.INACTIVE),
      sections: sections.length,
      sectionsWithoutInstructor: sections.filter((s) => !s.instructorId),
      studentsWithoutSection: count((u) => u.role === ROLES.STUDENT && !sectionIds.has(String(u.sectionId))),
      modules: course.modules.length,
      lessons: course.lessons.length,
      missions: course.missions.length,
    };
  }
}
