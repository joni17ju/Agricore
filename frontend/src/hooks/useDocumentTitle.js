import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · AgriCore` : 'AgriCore · Principles of Crop Protection I';
  }, [title]);
}
