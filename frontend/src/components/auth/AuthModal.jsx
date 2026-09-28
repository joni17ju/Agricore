import Modal from '../common/Modal.jsx';
import AuthPanel, { AUTH_VIEWS } from './AuthPanel.jsx';

export { AUTH_VIEWS };

/**
 * The split auth panel shown over the landing page.
 *
 * `bare` because the panel supplies its own close button, inside the form
 * column where the reference layout puts it. Modal still handles the backdrop,
 * focus, Escape, scroll lock and the open/close animation.
 *
 * @param {{ view: string|null, onChangeView: (view: string) => void, onClose: () => void }} props
 */
export default function AuthModal({ view, onChangeView, onClose }) {
  return (
    <Modal
      isOpen={view !== null}
      onClose={onClose}
      size="lg"
      bare
      label={view === AUTH_VIEWS.REGISTER ? 'Create your account' : 'Sign in'}
    >
      {/* Only mounted while open, so each opening starts from a clean form. */}
      {view !== null && <AuthPanel view={view} onChangeView={onChangeView} onClose={onClose} />}
    </Modal>
  );
}
