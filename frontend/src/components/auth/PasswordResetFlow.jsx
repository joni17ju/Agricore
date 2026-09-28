import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import { TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import {
  RESET_CODE_LENGTH,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
} from '../../services/authService.js';

/**
 * Forgotten-password flow: ask for a code, type the code, choose a password.
 *
 * Three steps rather than one form so the emailed code is exchanged for a
 * reset token before any password is typed — the code never travels together
 * with the new password, and the browser stops holding it once it is spent.
 *
 * Renders its own actions rather than filling a Modal footer, because it is
 * shown as one view inside the auth modal instead of a dialog of its own.
 *
 * @param {{ onTitleChange: (title: string) => void, onCancel: () => void, onSignIn: () => void }} props
 */

const RESET_STEPS = { REQUEST: 'request', CODE: 'code', PASSWORD: 'password', DONE: 'done' };

const EMPTY_RESET = {
  identifier: '',
  code: '',
  resetToken: '',
  newPassword: '',
  confirmPassword: '',
};

const TITLES = {
  [RESET_STEPS.REQUEST]: 'Reset password',
  [RESET_STEPS.CODE]: 'Enter your code',
  [RESET_STEPS.PASSWORD]: 'Choose a new password',
  [RESET_STEPS.DONE]: 'Password updated',
};

export default function PasswordResetFlow({ onTitleChange, onCancel, onSignIn }) {
  const [step, setStep] = useState(RESET_STEPS.REQUEST);
  const [form, setForm] = useState(EMPTY_RESET);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // The modal header belongs to the parent, so tell it which step we are on.
  useEffect(() => {
    onTitleChange(TITLES[step]);
  }, [step, onTitleChange]);

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

  /** Back to step one, keeping the identifier so it need not be retyped. */
  const startOver = () => {
    setForm({ ...EMPTY_RESET, identifier: form.identifier });
    setNotice('');
    setError('');
    setStep(RESET_STEPS.REQUEST);
  };

  const actions = {
    [RESET_STEPS.REQUEST]: (
      <>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
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
        <Button variant="secondary" onClick={onCancel} disabled={isBusy}>Cancel</Button>
        <Button onClick={savePassword} isLoading={isBusy}>Save password</Button>
      </>
    ),
    [RESET_STEPS.DONE]: <Button onClick={onSignIn}>Back to sign in</Button>,
  };

  return (
    <div className="auth-view">
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

      <div className="auth-view__actions">{actions[step]}</div>
    </div>
  );
}
