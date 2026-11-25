import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { PageLoader } from '../components/common/Display.jsx';
import { ROLE_HOME } from '../constants/roles.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Where to go after signing in: back to the page the guard sent the visitor
 * away from, when that page belongs to their role, otherwise their home.
 */
export function returnPathFor(user, from) {
  const home = ROLE_HOME[user.role];
  return typeof from === 'string' && from.startsWith(`${home}`) ? from : home;
}

/** First load is waiting on the server; explain, and offer a retry if it never answers. */
function StartupGate() {
  const { startupError, retryStartup } = useAuth();
  if (!startupError) return <PageLoader label="Loading AgriCore…" />;
  return (
    <PageLoader label="The server is not answering yet">
      <p className="page-loader__hint">
        AgriCore&apos;s server may still be waking up, or your connection dropped. You are still signed in.
      </p>
      <Button icon="refresh" onClick={retryStartup}>Try again</Button>
    </PageLoader>
  );
}

/** Only lets the signed-in user through when their role matches. */
export default function RequireRole({ role }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <StartupGate />;
  if (!user) {
    // The full address, so signing in returns to the exact page, query and section.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

/** Sends signed-in users away from the login/register pages — back to where they were headed. */
export function RedirectIfSignedIn() {
  const { user, isReady } = useAuth();
  const location = useLocation();
  if (!isReady) return <StartupGate />;
  if (user) return <Navigate to={returnPathFor(user, location.state?.from)} replace />;
  return <Outlet />;
}
