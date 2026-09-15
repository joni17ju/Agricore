import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader (usually a service call) and track its state.
 * The loader re-runs whenever `deps` change; `reload()` re-runs it manually
 * without clearing the current data (no loading flash).
 *
 * @returns {{ data, error, isLoading, reload, setData }}
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setState((previous) => ({ ...previous, isLoading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, error: null, isLoading: false });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((previous) => ({ ...previous, error, isLoading: false }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run({ silent: true }), [run]);
  const setData = useCallback((updater) => {
    setState((previous) => ({
      ...previous,
      data: typeof updater === 'function' ? updater(previous.data) : updater,
    }));
  }, []);

  return { ...state, reload, setData };
}
