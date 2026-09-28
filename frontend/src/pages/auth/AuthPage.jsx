import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthPanel, { AUTH_VIEWS } from '../../components/auth/AuthPanel.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/**
 * /login and /register as standalone pages.
 *
 * Renders the same split panel the landing page shows in a dialog, so a direct
 * link, a bookmark or a redirect from a route guard all land on the same
 * layout. There is no close button here — there is nothing behind it to close
 * back to — so the panel is given no `onClose`.
 *
 * @param {{ initialView: 'login'|'register' }} props
 */
export default function AuthPage({ initialView = AUTH_VIEWS.LOGIN }) {
  const [view, setView] = useState(initialView);
  const navigate = useNavigate();

  useDocumentTitle(view === AUTH_VIEWS.REGISTER ? 'Create account' : 'Sign in');

  /*
   * Switching between sign-in and registration keeps the URL in step, so the
   * address bar never disagrees with what is on screen. replace, because
   * toggling between the two is not a journey worth stepping back through.
   */
  const changeView = (next) => {
    setView(next);
    if (next === AUTH_VIEWS.LOGIN) navigate('/login', { replace: true });
    if (next === AUTH_VIEWS.REGISTER) navigate('/register', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <AuthPanel view={view} onChangeView={changeView} />
      </div>
    </div>
  );
}
