/**
 * Start downloading the code of the page a signed-in user lands on, before the
 * router asks for it. Same module paths as the lazy() routes in AppRouter, so
 * the browser fetches each file once.
 */
export function preloadHome(role) {
  const load =
    role === 'student'
      ? [import('../layouts/StudentLayout.jsx'), import('../pages/student/StudentDashboard.jsx')]
      : role === 'instructor'
        ? [import('../layouts/InstructorLayout.jsx'), import('../pages/instructor/InstructorDashboard.jsx')]
        : [];
  Promise.all(load).catch(() => {});
}
