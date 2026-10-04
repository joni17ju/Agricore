import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import { StatusPill } from '../components/common/Display.jsx';
import { listPendingStudents } from '../services/userService.js';

/**
 * Instructor navigation.
 *
 * Section and account management used to live under the administrator role;
 * they sit here now that the programme head does that job as an instructor.
 */
const navGroups = (pendingCount) => [
  { label: 'Overview', items: [{ to: '/instructor', label: 'Dashboard', icon: 'dashboard', end: true }] },
  {
    label: 'Management',
    items: [
      { to: '/instructor/modules', label: 'Modules', icon: 'folder' },
      { to: '/instructor/roster', label: 'Roster and Enrollment', icon: 'users' },
      { to: '/instructor/requests', label: 'Account Requests', icon: 'user-check', badge: pendingCount },
      { to: '/instructor/sections', label: 'Sections', icon: 'layers' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/instructor/performance', label: 'Student Performance', icon: 'chart' },
      { to: '/instructor/leaderboard', label: 'Leaderboard', icon: 'trophy' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/instructor/profile', label: 'Profile', icon: 'user' }],
  },
];

/** Slow poll: a request arriving is not urgent enough to ask more often. */
const PENDING_POLL_MS = 45000;

export default function InstructorLayout() {
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const pending = await listPendingStudents();
      setPendingCount(pending.length);
    } catch {
      // A failed poll is not worth surfacing; the next one will try again.
    }
  }, []);

  /*
   * Refetched on navigation as well as on a timer, so approving a request and
   * leaving the page updates the badge immediately rather than after the next
   * poll — that is the path this number actually changes on.
   */
  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(refresh, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <AppShell
      navGroups={navGroups(pendingCount)}
      homePath="/instructor"
      topbarRight={<StatusPill tone="green" icon="user-check">Instructor</StatusPill>}
    />
  );
}
