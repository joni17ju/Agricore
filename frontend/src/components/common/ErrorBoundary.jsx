import { Component } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

const RELOAD_FLAG = 'agricore.chunkReload';

/*
 * After a new version is deployed, a tab opened on the old one asks for
 * page files that no longer exist. That is not a bug in the page, so the
 * boundary reloads once to pick up the new version instead of showing an
 * error. The flag stops a reload loop if the files are genuinely missing.
 */
const isStaleChunk = (error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    String(error?.message ?? error),
  );

function reloadOnceForNewVersion() {
  try {
    if (window.sessionStorage.getItem(RELOAD_FLAG)) return false;
    window.sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Clears the one-reload flag once a page has rendered normally. */
export function markAppHealthy() {
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

/**
 * Catches a crash while rendering a page, so one broken screen shows an
 * explanation and a way out instead of a blank page. Give it a `resetKey`
 * (the route) so moving to another page clears the error.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (isStaleChunk(error) && reloadOnceForNewVersion()) return;
    console.error('[AgriCore] page crashed', error, info?.componentStack);
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isStaleChunk(error);
    return (
      <div className="crash-state">
        <div className="empty-state">
          <span className="empty-state__icon empty-state__icon--error">
            <Icon name="alert" size={28} />
          </span>
          <h3>{stale ? 'AgriCore has been updated' : 'This page ran into a problem'}</h3>
          <p className="text-muted">
            {stale
              ? 'Reload to get the latest version. Your progress is saved.'
              : 'Your progress is saved. Reload the page, or go back to your dashboard.'}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Button variant="secondary" icon="home" onClick={() => window.location.assign(this.props.homePath ?? '/')}>
              Dashboard
            </Button>
            <Button icon="refresh" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      </div>
    );
  }
}
