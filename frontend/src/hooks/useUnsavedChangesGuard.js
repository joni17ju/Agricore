import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Warn before leaving a page with unsaved changes.
 *
 * The app uses <BrowserRouter>, which has no navigation blocker (that needs a
 * data router), so this covers the ways out it can see:
 *  - reload, closing the tab or typing a new address: the browser's own
 *    "leave site?" prompt, via beforeunload;
 *  - any in-app link (sidebar, breadcrumbs, "Back to lessons"): the click is
 *    caught on the document in the capture phase — before React Router's own
 *    handler on the root — and held until the user confirms.
 * The browser's Back button is not covered; there is no reliable way to stop
 * it without a data router.
 *
 * @returns {{ pendingHref: string|null, confirmLeave: () => void, cancelLeave: () => void }}
 */
export function useUnsavedChangesGuard(isDirty) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState(null);
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      // Required by some browsers to show the prompt at all.
      event.returnValue = '';
    };
    const onClick = (event) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const href = `${url.pathname}${url.search}${url.hash}`;
      if (href === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    // The caller's dirty state goes when the page unmounts; navigate past it now.
    dirtyRef.current = false;
    if (href) navigate(href);
  }, [pendingHref, navigate]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  return { pendingHref, confirmLeave, cancelLeave };
}
