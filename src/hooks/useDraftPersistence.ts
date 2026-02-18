import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDraftPersistence — Saves form data to localStorage with debounce.
 * 
 * Usage:
 *   const { draft, saveDraft, clearDraft, hasDraft } = useDraftPersistence<MyFormData>('lesson:uuid');
 *   
 *   // On mount: check if hasDraft, offer to restore
 *   // On field change: saveDraft(formData)
 *   // On successful DB save: clearDraft()
 */
export function useDraftPersistence<T>(key: string, debounceMs = 1000) {
    const storageKey = `draft:${key}`;
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [hasDraft, setHasDraft] = useState(false);

    // Check for existing draft on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            setHasDraft(!!stored);
        } catch {
            setHasDraft(false);
        }
    }, [storageKey]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    /**
     * Load draft data from localStorage
     */
    const loadDraft = useCallback((): T | null => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored) as T;
            }
        } catch (err) {
            console.error('Failed to load draft:', err);
        }
        return null;
    }, [storageKey]);

    /**
     * Save draft data with debounce
     */
    const saveDraft = useCallback((data: T) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(data));
                setHasDraft(true);
            } catch (err) {
                console.error('Failed to save draft:', err);
            }
        }, debounceMs);
    }, [storageKey, debounceMs]);

    /**
     * Save draft immediately (no debounce)
     */
    const saveDraftNow = useCallback((data: T) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
            setHasDraft(true);
        } catch (err) {
            console.error('Failed to save draft:', err);
        }
    }, [storageKey]);

    /**
     * Clear draft from localStorage (call on successful save)
     */
    const clearDraft = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        try {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
        } catch (err) {
            console.error('Failed to clear draft:', err);
        }
    }, [storageKey]);

    return {
        loadDraft,
        saveDraft,
        saveDraftNow,
        clearDraft,
        hasDraft,
    };
}
