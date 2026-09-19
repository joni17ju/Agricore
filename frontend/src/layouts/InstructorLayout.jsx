import AppShell from '../components/layout/AppShell.jsx';
import { StatusPill } from '../components/common/Display.jsx';

/** Navigation groups follow the instructor mockups (Figs 24–27). */
const NAV_GROUPS = [
  { label: 'Overview', items: [{ to: '/instructor', label: 'Dashboard', icon: 'dashboard', end: true }] },
  {
    label: 'Management',
    items: [
      { to: '/instructor/modules', label: 'Modules', icon: 'folder' },
      { to: '/instructor/roster', label: 'Roster and Enrollment', icon: 'users' },
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
    items: [
      { to: '/instructor/profile', label: 'Profile', icon: 'user' },
    ],
  },
];

export default function InstructorLayout() {
  return (
    <AppShell
      navGroups={NAV_GROUPS}
      homePath="/instructor"
      topbarRight={<StatusPill tone="green" icon="user-check">Instructor</StatusPill>}
    />
  );
}
