import AppShell from '../components/layout/AppShell.jsx';
import { StatusPill } from '../components/common/Display.jsx';

const NAV_GROUPS = [
  { label: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true }] },
  {
    label: 'Administration',
    items: [
      { to: '/admin/users', label: 'User Management', icon: 'users' },
      { to: '/admin/sections', label: 'Sections', icon: 'layers' },
    ],
  },
];

export default function AdminLayout() {
  return (
    <AppShell
      navGroups={NAV_GROUPS}
      homePath="/admin"
      topbarRight={<StatusPill tone="dark" icon="shield">Administrator</StatusPill>}
    />
  );
}
