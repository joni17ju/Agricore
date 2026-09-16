import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lets a page extend the top bar breadcrumb with its own segments, e.g.
 * "Principles of Crop Protection I › Modules › Plant Pathology".
 * Without any page segments the top bar falls back to the active nav item.
 */
const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [trail, setTrail] = useState([]);
  const value = useMemo(() => ({ trail, setTrail }), [trail]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/** Read the current page segments (used by the top bar). */
export function useBreadcrumbTrail() {
  return useContext(BreadcrumbContext)?.trail ?? [];
}

/**
 * Set breadcrumb segments while this page is mounted.
 * @param {{ label: string, to?: string }[] | null} segments  pass null while data loads
 */
export function useBreadcrumb(segments) {
  const context = useContext(BreadcrumbContext);
  const setTrail = context?.setTrail;
  const serialized = JSON.stringify(segments ?? []);

  useEffect(() => {
    if (!setTrail) return undefined;
    setTrail(JSON.parse(serialized));
    return () => setTrail([]);
  }, [serialized, setTrail]);
}
