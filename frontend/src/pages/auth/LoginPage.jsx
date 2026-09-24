import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { Logo } from '../../components/common/Display.jsx';
import { TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal from '../../components/common/Modal.jsx';
import { ROLE_HOME, ROLE_LABELS, ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import {
  RESET_CODE_LENGTH,
  getDemoAccounts,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from '../../services/authService.js';

/**
 * Drop your own hero image here and it appears in the right panel:
 *   frontend/public/images/login-hero.jpg
 * Until then, the panel falls back to a soft green gradient.
 */
const HERO_IMAGE = '/images/login-hero.jpg';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', icon: 'user-check' },
];

const DEMO_ICONS = { student: 'sprout', instructor: 'user-check', admin: 'shield' };

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hasHeroImage, setHasHeroImage] = useState(true);
  const demoAccounts = useAsync(getDemoAccounts, []);

  const goHome = (user) => navigate(ROLE_HOME[user.role], { replace: true });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      goHome(await login({ ...form, role }));
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDemo = async (userId) => {
    setError('');
    try {
      goHome(await loginAsDemo(userId));
    } catch (err) {
      setError(err.message);
    }
  };

  const roleIndex = ROLE_OPTIONS.findIndex((option) => option.value === role);

  return (
    <div className="login-shell">
      <div className="login-card">
        {/* ── Form panel ── */}
        <div className="login-panel">
          <div className="login-panel__inner">
            <div className="login-brand anim-fade-up" style={{ '--i': 0 }}>
              <Logo />
            </div>

            <header className="login-heading anim-fade-up" style={{ '--i': 1 }}>
              <h1>Welcome Back!</h1>
              <p>Please log in to your AgriCore account.</p>
            </header>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* Role selection — same state and logic as before, shown as a segmented toggle. */}
              <div className="anim-fade-up" style={{ '--i': 2 }}>
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

              <div className="login-field anim-fade-up" style={{ '--i': 3 }}>
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

              <div className="login-field anim-fade-up" style={{ '--i': 4 }}>
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

              <div className="login-form__row anim-fade-up" style={{ '--i': 5 }}>
                <button type="button" className="link-button" onClick={() => setResetOpen(true)}>Forgot password?</button>
              </div>

              <div className="login-actions anim-fade-up" style={{ '--i': 6 }}>
                <Button type="submit" size="lg" isLoading={isSubmitting}>Login</Button>
                <Button variant="secondary" size="lg" to="/register">Create account</Button>
              </div>
            </form>

            <section className="login-demo anim-fade-up" style={{ '--i': 7 }}>
              <div className="login-demo__title">
                <Icon name="sparkles" size={15} /> Prototype demo accounts
              </div>
              <p>Pick an account to sign in instantly, or use the form above. The demo password is <strong>agricore123</strong>.</p>
              <div className="login-demo__list">
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

            <p className="login-fineprint anim-fade-up" style={{ '--i': 8 }}>
              Prototype build for Principles of Crop Protection I · demo accounts, real authentication.
            </p>
          </div>
        </div>

        {/* ── Visual panel: your image + decorative overlays ── */}
        {/* Not aria-hidden as a whole any more: the welcome line is real content,
            so only the decorative layers below are hidden from screen readers. */}
        <div className={`login-visual ${hasHeroImage ? '' : 'has-fallback'}`}>
          {hasHeroImage && (
            <img className="login-visual__photo" src={HERO_IMAGE} alt="" aria-hidden="true" onError={() => setHasHeroImage(false)} />
          )}
          <span className="login-visual__wash" aria-hidden="true" />
          <svg className="login-visual__shapes" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path className="shape shape--a" d="M40 90 Q150 20 250 80 Q170 170 40 90 Z" />
            <path className="shape shape--b" d="M300 420 Q400 360 392 470 Q330 540 300 420 Z" />
            <path className="shape shape--c" d="M-30 330 Q90 280 140 380 Q60 470 -30 330 Z" />
            <circle className="shape shape--d" cx="330" cy="150" r="58" />
            <path className="shape shape--e" d="M120 520 Q210 470 260 560 Q180 610 120 520 Z" />
          </svg>
          <span className="login-visual__glass login-visual__glass--one" aria-hidden="true" />
          <span className="login-visual__glass login-visual__glass--two" aria-hidden="true" />

          {/* Sits in the clear band between the two glass panels, so it never
              lands on top of them at any width. */}
          <p className="login-visual__hero anim-fade-up" style={{ '--i': 2 }}>
            Welcome to <span>AgriCore</span>
          </p>
        </div>

        {/* Floating accent — AgriCore sprout motif on the seam between panels */}
        <span className="login-seed" aria-hidden="true">
          <span className="login-seed__orb">
            <Icon name="sprout" size={24} />
          </span>
        </span>
      </div>

      <ForgotPasswordModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}

/**
 * Forgotten-password flow: ask for a code, type the code, choose a password.
 *
 * Three steps rather than one form so the emailed code is exchanged for a
 * reset token before any password is typed — the code never travels together
 * with the new password, and the browser stops holding it once it is spent.
 */
const RESET_STEPS = { REQUEST: 'request', CODE: 'code', PASSWORD: 'password', DONE: 'done' };

const EMPTY_RESET = {
  identifier: '',
  code: '',
  resetToken: '',
  newPassword: '',
  confirmPassword: '',
};

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(RESET_STEPS.REQUEST);
  const [form, setForm] = useState(EMPTY_RESET);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  /** Every step does the same thing around its own request. */
  const run = async (action) => {
    setError('');
    setIsBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const result = await requestPasswordReset(form.identifier);
      setNotice(result.message);
      setStep(RESET_STEPS.CODE);
    });

  const checkCode = () =>
    run(async () => {
      const { resetToken } = await verifyResetCode({ identifier: form.identifier, code: form.code });
      set({ resetToken });
      setNotice('');
      setStep(RESET_STEPS.PASSWORD);
    });

  const savePassword = () =>
    run(async () => {
      await resetPassword({
        resetToken: form.resetToken,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setStep(RESET_STEPS.DONE);
    });

  const close = () => {
    setStep(RESET_STEPS.REQUEST);
    setForm(EMPTY_RESET);
    setNotice('');
    setError('');
    onClose();
  };

  /** Back to step one, keeping the identifier so it need not be retyped. */
  const startOver = () => {
    setForm({ ...EMPTY_RESET, identifier: form.identifier });
    setNotice('');
    setError('');
    setStep(RESET_STEPS.REQUEST);
  };

  const TITLES = {
    [RESET_STEPS.REQUEST]: 'Reset password',
    [RESET_STEPS.CODE]: 'Enter your code',
    [RESET_STEPS.PASSWORD]: 'Choose a new password',
    [RESET_STEPS.DONE]: 'Password updated',
  };

  const footers = {
    [RESET_STEPS.REQUEST]: (
      <>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button onClick={sendCode} isLoading={isBusy}>Send code</Button>
      </>
    ),
    [RESET_STEPS.CODE]: (
      <>
        <Button variant="secondary" onClick={startOver} disabled={isBusy}>Back</Button>
        <Button onClick={checkCode} isLoading={isBusy}>Verify code</Button>
      </>
    ),
    [RESET_STEPS.PASSWORD]: (
      <>
        <Button variant="secondary" onClick={close} disabled={isBusy}>Cancel</Button>
        <Button onClick={savePassword} isLoading={isBusy}>Save password</Button>
      </>
    ),
    [RESET_STEPS.DONE]: <Button onClick={close}>Back to sign in</Button>,
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={TITLES[step]} size="sm" footer={footers[step]}>
      {/* The error belongs to the step, not to one field: an expired code and a
          rejected token are both step-level problems. */}
      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {step === RESET_STEPS.REQUEST && (
        <>
          <p className="text-muted reset-step__intro">
            Enter your email address or school ID and we will send a {RESET_CODE_LENGTH}-digit
            verification code to the email address on your account.
          </p>
          <TextInput
            label="Email or school ID"
            /* Not type="email": a school ID would fail the browser's check. */
            type="text"
            autoComplete="username"
            placeholder="juan.delacruz@dorsu.edu.ph or 2023-0101"
            value={form.identifier}
            onChange={(event) => set({ identifier: event.target.value })}
            required
          />
        </>
      )}

      {step === RESET_STEPS.CODE && (
        <>
          {notice && <p className="text-muted reset-step__intro">{notice}</p>}
          <TextInput
            label="Verification code"
            /* inputMode brings up the number pad without type="number", which
               would strip a leading zero and add stepper arrows. */
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={RESET_CODE_LENGTH}
            placeholder="123456"
            className="input--code"
            hint="The code expires 15 minutes after it is sent. You can request up to 3 codes every 15 minutes."
            value={form.code}
            // Digits only, so a pasted code with stray spaces still works.
            onChange={(event) => set({ code: event.target.value.replace(/\D/g, '').slice(0, RESET_CODE_LENGTH) })}
            required
          />
        </>
      )}

      {step === RESET_STEPS.PASSWORD && (
        <>
          <p className="text-muted reset-step__intro">
            Code accepted. Choose a new password for your account.
          </p>
          <TextInput
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => set({ newPassword: event.target.value })}
            required
          />
          <TextInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => set({ confirmPassword: event.target.value })}
            required
          />
        </>
      )}

      {step === RESET_STEPS.DONE && (
        <p className="text-muted reset-step__intro">
          Your password has been updated. Sign in with your new password to continue.
        </p>
      )}
    </Modal>
  );
}
