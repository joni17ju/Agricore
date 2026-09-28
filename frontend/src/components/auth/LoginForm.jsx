import { useState } from 'react';
import Button from '../common/Button.jsx';
import { Skeleton } from '../common/Display.jsx';
import { TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import { ROLE_LABELS, ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getDemoAccounts } from '../../services/authService.js';

/**
 * The sign-in form on its own, with no page chrome around it.
 *
 * Lives here rather than in a page so the auth modal and any future caller
 * share one implementation — the form logic should not be duplicated just
 * because it is presented in two places.
 *
 * Switching to registration is the panel's job, not the form's, so there is
 * no secondary action here — just the one primary button.
 *
 * @param {{ onSuccess: (user) => void, onForgotPassword: () => void }} props
 */

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', icon: 'user-check' },
];

const DEMO_ICONS = { student: 'sprout', instructor: 'user-check', admin: 'shield' };

export default function LoginForm({ onSuccess, onForgotPassword }) {
  const { login, loginAsDemo } = useAuth();
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const demoAccounts = useAsync(getDemoAccounts, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      onSuccess(await login({ ...form, role }));
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDemo = async (userId) => {
    setError('');
    try {
      onSuccess(await loginAsDemo(userId));
    } catch (err) {
      setError(err.message);
    }
  };

  const roleIndex = ROLE_OPTIONS.findIndex((option) => option.value === role);

  return (
    <>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div>
          <span className="login-form__label">Sign in as</span>
          <div className="role-toggle" role="radiogroup" aria-label="Sign in as">
            <span className="role-toggle__indicator" style={{ transform: `translateX(${roleIndex * 100}%)` }} aria-hidden="true" />
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={role === option.value}
                className={`role-toggle__option ${role === option.value ? 'is-active' : ''}`}
                onClick={() => setRole(option.value)}
              >
                <Icon name={option.icon} size={17} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="form-error" role="alert">
            <Icon name="alert" size={16} /> {error}
          </div>
        )}

        <div className="login-field">
          <TextInput
            label={role === ROLES.STUDENT ? 'Email or school ID' : 'Email address'}
            /* Not type="email": the browser would reject a school ID. */
            type="text"
            autoComplete="username"
            placeholder={role === ROLES.STUDENT ? 'juan.delacruz@dorsu.edu.ph or 2023-0101' : 'c.reyes@dorsu.edu.ph'}
            hint={role === ROLES.STUDENT ? 'Sign in with your email address or your school ID number.' : undefined}
            value={form.identifier}
            onChange={(event) => setForm({ ...form, identifier: event.target.value })}
            required
          />
        </div>

        <div className="login-field">
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </div>

        <div className="login-form__row">
          <button type="button" className="link-button" onClick={onForgotPassword}>Forgot password?</button>
        </div>

        <div className="login-actions login-actions--single">
          <Button type="submit" size="lg" isLoading={isSubmitting}>Login</Button>
        </div>
      </form>

      <section className="login-demo">
        <div className="login-demo__title">
          <Icon name="sparkles" size={15} /> Prototype demo accounts
        </div>
        <p>Pick an account to sign in instantly, or use the form above. The demo password is <strong>agricore123</strong>.</p>
        <div className="login-demo__list">
          {/* The list is fetched when the modal opens, not when the page loads,
              so without this the block sits visibly empty for a moment. */}
          {demoAccounts.isLoading && !demoAccounts.data &&
            [0, 1, 2].map((i) => (
              <span key={i} className="login-demo__account is-loading" aria-hidden="true">
                <Skeleton width="100%" label="Loading demo accounts" />
              </span>
            ))}
          {demoAccounts.error && !demoAccounts.data && (
            <p className="text-muted text-sm">Demo accounts are unavailable right now.</p>
          )}
          {(demoAccounts.data ?? []).map((account) => (
            <button
              key={account._id}
              type="button"
              className="login-demo__account"
              title={`${ROLE_LABELS[account.role]} — ${account.firstName} ${account.lastName}`}
              onClick={() => handleDemo(account._id)}
            >
              <Icon name={DEMO_ICONS[account.role]} size={17} />
              <span>
                <strong>{ROLE_LABELS[account.role]}</strong>
                <small>{account.firstName} {account.lastName}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
