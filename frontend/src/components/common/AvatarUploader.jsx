import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { removeAvatar, uploadAvatar } from '../../services/userService.js';
import { Avatar } from './Display.jsx';
import Icon from './Icon.jsx';

/**
 * The user's avatar with a camera button for changing the picture.
 *
 * Reusable across the three role profile pages: it reads the signed-in user
 * from AuthContext and refreshes it after a save, so every other avatar on
 * screen (navbar, leaderboard, roster) picks the new picture up at once.
 */
export default function AvatarUploader({ size = 96 }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after an error.
    event.target.value = '';
    if (!file) return;
    setError('');
    setIsSaving(true);
    try {
      await uploadAvatar(user._id, file);
      await refreshUser();
      toast.success('Profile picture updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const clear = async () => {
    setError('');
    setIsSaving(true);
    try {
      await removeAvatar(user._id);
      await refreshUser();
      toast.success('Profile picture removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-upload__frame" style={{ width: size, height: size }}>
        <Avatar firstName={user.firstName} lastName={user.lastName} size={size} src={user.avatarUrl} />
        <button
          type="button"
          className="avatar-upload__btn"
          onClick={() => inputRef.current?.click()}
          disabled={isSaving}
          aria-label={user.avatarUrl ? 'Change profile picture' : 'Upload a profile picture'}
          title={user.avatarUrl ? 'Change profile picture' : 'Upload a profile picture'}
        >
          <Icon name={isSaving ? 'clock' : 'camera'} size={15} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={pick}
        />
      </div>

      {user.avatarUrl && (
        <button type="button" className="link-button avatar-upload__remove" onClick={clear} disabled={isSaving}>
          Remove photo
        </button>
      )}

      {error && (
        <p className="form-error avatar-upload__error" role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}
    </div>
  );
}
