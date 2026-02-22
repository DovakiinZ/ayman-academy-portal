import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onBeforeUnload?: () => void;
  message?: string;
}

/**
 * Hook to protect against losing unsaved changes.
 * Shows browser warning on close/refresh.
 *
 * Note: React Router in-app navigation blocking requires a data router
 * (createBrowserRouter). Since the app uses <BrowserRouter>, we only
 * guard against browser-level navigation (refresh, close, external link).
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  onBeforeUnload,
}: UseUnsavedChangesOptions) {
  const dirtyRef = useRef(hasUnsavedChanges);
  dirtyRef.current = hasUnsavedChanges;

  // Browser beforeunload event (page close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
        onBeforeUnload?.();
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [onBeforeUnload]);

  return {};
}
