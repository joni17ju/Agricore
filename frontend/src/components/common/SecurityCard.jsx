import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { changePassword } from '../../services/authService.js';
import Button from './Button.jsx';
import Card from './Card.jsx';
import { TextInput } from './Form.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Security section of the profile pages: currently just the password change.
 *
 * Validation runs here for immediate feedback, but the current password is
 * only ever confirmed by the server against the stored bcrypt hash — this
 * component cannot authorise the change on its own.
 */
export default function SecurityCard() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setIsOpen(false);
    setForm(EMPTY);
    setError('');
  };

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
  };

  const submit = async (event) => {
    event?.preventDefault();
    setIsSaving(true);
    try {
      await changePassword(form);
      toast.success('Password updated.');
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card title="Security" icon="shield" className="anim-fade-up">
        <div className="security-row">
          <div className="security-row__text">
            <strong>Password</strong>
            <span className="text-muted text-sm">
              Change the password you use to sign in. You&rsquo;ll need your current one.
            </span>
          </div>
          <Button variant="secondary" icon="lock" onClick={() => setIsOpen(true)}>
            Change Password
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Change password"
        description="Enter your current password, then choose a new one."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isSaving}>Cancel</Button>
            <Button icon="check" onClick={submit} isLoading={isSaving}>Update password</Button>
          </>
        }
      >
        {/* A real form element so Enter submits and password managers behave. */}
        <form className="stack" onSubmit={submit}>
          {error && (
            <p className="form-error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </p>
          )}
          <TextInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            autoFocus
            required
          />
          <TextInput
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={form.newPassword}
            onChange={set('newPassword')}
            required
          />
          <TextInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            required
          />
          {/* Lets Enter submit without duplicating the footer button. */}
          <button type="submit" className="visually-hidden" tabIndex={-1} aria-hidden="true" />
        </form>
      </Modal>
    </>
  );
}
