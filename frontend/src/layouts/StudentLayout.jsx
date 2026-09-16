import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import { XPPill } from '../components/common/Display.jsx';
import Icon from '../components/common/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getStudentXpSummary } from '../services/progressService.js';

const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      { to: '/student', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/student/modules', label: 'Modules', icon: 'book' },
      { to: '/student/missions', label: 'Mission', icon: 'target' },
    ],
  },
  {
    label: 'Compete',
    items: [
      { to: '/student/leaderboard', label: 'Leaderboard', icon: 'trophy' },
      { to: '/student/profile', label: 'Profile', icon: 'user' },
    ],
  },
];

export default function StudentLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [summary, setSummary] = useState(null);

  const refreshSummary = useCallback(() => {
    getStudentXpSummary(user._id).then(setSummary).catch(() => setSummary(null));
  }, [user._id]);

  useEffect(refreshSummary, [refreshSummary, location.pathname]);

  return (
    <AppShell
      navGroups={NAV_GROUPS}
      homePath="/student"
      outletContext={{ refreshSummary, summary }}
      topbarRight={
        summary && (
          <>
            {summary.streak > 0 && (
              <span className="topbar__streak" title={`${summary.streak}-day streak`}>
                <Icon name="flame" size={17} /> {summary.streak}
              </span>
            )}
            <span className="pill pill--dark">Lv {summary.level.level}</span>
            <XPPill xp={summary.totalXP} />
          </>
        )
      }
    />
  );
}
