import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button, { IconButton } from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import { ROLE_HOME, ROLES } from '../../constants/roles.js';
import LoginForm from './LoginForm.jsx';
import PasswordResetFlow from './PasswordResetFlow.jsx';
import RegisterForm from './RegisterForm.jsx';

/**
 * The split sign-in surface: brand panel on the left, form on the right.
 *
 * One component for both presentations. The landing page wraps it in a Modal
 * and passes `onClose` to get the X; /login and /register render it directly
 * on a page with no close button. Either way the views, the switching between
 * them and the auth calls are the same code.
 *
 * @param {{
 *   view: string,
 *   onChangeView: (view: string) => void,
 *   onClose?: () => void,
 * }} props
 */

export const AUTH_VIEWS = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', PENDING: 'pending' };

const HEADINGS = {
  [AUTH_VIEWS.LOGIN]: { title: 'Welcome back', subtitle: 'Sign in to your AgriCore account.' },
  [AUTH_VIEWS.REGISTER]: { title: 'Create your account', subtitle: 'Join AgriCore for Principles of Crop Protection I.' },
  [AUTH_VIEWS.PENDING]: { title: 'Registration received', subtitle: null },
};

export default function AuthPanel({ view, onChangeView, onClose }) {
  const navigate = useNavigate();
  // The reset flow owns its step titles and reports them up.
  const [resetTitle, setResetTitle] = useState('Reset password');

  /* Stable identity: the reset flow reports its title from an effect keyed on
     this callback, so a new function each render would loop. */
  const handleResetTitle = useCallback((title) => setResetTitle(title), []);

  const goHome = (user) => {
    onClose?.();
    navigate(ROLE_HOME[user.role], { replace: true });
  };

  const heading =
    view === AUTH_VIEWS.FORGOT
      ? { title: resetTitle, subtitle: null }
      : HEADINGS[view] ?? HEADINGS[AUTH_VIEWS.LOGIN];

  return (
    <div className={`auth-split auth-split--${view}`}>
      {/* ── Brand panel ── */}
      <aside className="auth-brand" aria-hidden="true">
        <span className="auth-brand__wash" />
        <svg className="auth-brand__shapes" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
          <path className="shape shape--a" d="M40 90 Q150 20 250 80 Q170 170 40 90 Z" />
          <path className="shape shape--b" d="M300 420 Q400 360 392 470 Q330 540 300 420 Z" />
          <path className="shape shape--c" d="M-30 330 Q90 280 140 380 Q60 470 -30 330 Z" />
          <circle className="shape shape--d" cx="330" cy="150" r="58" />
          <path className="shape shape--e" d="M120 520 Q210 470 260 560 Q180 610 120 520 Z" />
        </svg>

        <div className="auth-brand__content">
          <p className="auth-brand__welcome">Welcome to</p>
          <span className="auth-brand__mark">
            <Icon name="sprout" size={44} />
          </span>
          <p className="auth-brand__wordmark">AgriCore</p>
          <p className="auth-brand__tagline">Principles of Crop Protection I</p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <div className="auth-form-panel">
        {onClose && (
          <div className="auth-form-panel__close">
            <IconButton icon="x" label="Close" onClick={onClose} />
          </div>
        )}

        <div className="auth-form-panel__inner">
          <header className="auth-form-panel__head">
            <h1>{heading.title}</h1>
            {heading.subtitle && <p>{heading.subtitle}</p>}
          </header>

          {view === AUTH_VIEWS.LOGIN && (
            <>
              <LoginForm onSuccess={goHome} onForgotPassword={() => onChangeView(AUTH_VIEWS.FORGOT)} />
              <p className="auth-switch">
                Don&apos;t have an account?{' '}
                <button type="button" className="auth-switch__link" onClick={() => onChangeView(AUTH_VIEWS.REGISTER)}>
                  Create Account
                </button>
              </p>
            </>
          )}

          {view === AUTH_VIEWS.REGISTER && (
            <>
              <RegisterForm
                // A student account is active immediately, so registering signs them in.
                onSuccess={() => {
                  onClose?.();
                  navigate(ROLE_HOME[ROLES.STUDENT], { replace: true });
                }}
                onPendingApproval={() => onChangeView(AUTH_VIEWS.PENDING)}
              />
              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" className="auth-switch__link" onClick={() => onChangeView(AUTH_VIEWS.LOGIN)}>
                  Sign in
                </button>
              </p>
            </>
          )}

          {view === AUTH_VIEWS.FORGOT && (
            <PasswordResetFlow
              onTitleChange={handleResetTitle}
              // With no modal to close, cancelling returns to the sign-in view.
              onCancel={() => (onClose ? onClose() : onChangeView(AUTH_VIEWS.LOGIN))}
              onSignIn={() => onChangeView(AUTH_VIEWS.LOGIN)}
            />
          )}

          {view === AUTH_VIEWS.PENDING && (
            <div className="auth-view auth-pending">
              <span className="auth-pending__icon">
                <Icon name="user-check" size={28} />
              </span>
              <p>
                Instructor accounts are reviewed by the administrator. You can sign in as soon as your account is
                approved.
              </p>
              <div className="auth-view__actions">
                <Button onClick={() => onChangeView(AUTH_VIEWS.LOGIN)}>Back to sign in</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
