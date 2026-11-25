import { useEffect, useState } from 'react';
import { subscribeServerStatus } from '../../services/apiClient.js';
import { SproutLoader } from './Display.jsx';

/**
 * "Waking up the server…" — shown while any request is slow or being retried.
 *
 * The API's free host sleeps when nobody has used it for a while and needs up
 * to a minute to start again. Without this, the first visit of the day looked
 * frozen. The page underneath keeps its own loading state; this only explains
 * the wait, and goes away by itself once the server answers.
 */
export default function ServerWakeNotice() {
  const [status, setStatus] = useState('ok');
  useEffect(() => subscribeServerStatus(setStatus), []);

  if (status !== 'waking') return null;
  return (
    <div className="server-wake" role="status" aria-live="polite">
      <SproutLoader size={24} />
      <span>Waking up the server… this can take up to a minute.</span>
    </div>
  );
}
