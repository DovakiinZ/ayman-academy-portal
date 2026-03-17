/**
 * React Query + Persistent Cache Configuration
 *
 * Cache hierarchy:
 * 1. In-memory (instant, lost on refresh)
 * 2. localStorage (survives refresh, hydrated on boot)
 * 3. Supabase (background revalidation when stale)
 */

import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// ── Cache Timing Constants ──────────────────

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;

/** Stale time policies per resource type */
export const STALE_TIMES = {
    /** Stages, subjects list — rarely change */
    STATIC: 24 * HOUR,
    /** Courses, teacher list — change occasionally */
    SEMI_STATIC: 1 * HOUR,
    /** Student progress, dashboard aggregates — change often */
    DYNAMIC: 5 * MINUTE,
    /** Lesson content — moderate */
    CONTENT: 30 * MINUTE,
} as const;

// ── QueryClient ─────────────────────────────

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIMES.DYNAMIC,       // Default: 5min
            gcTime: 24 * HOUR,                     // Keep unused cache 24h
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,                          // Matched to App.tsx
        },
    },
});

// ── localStorage Persister ──────────────────

export const queryPersister = createSyncStoragePersister({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    key: 'ayman-academy-cache',
    /**
     * Serialize/deserialize: default JSON. Fine for our use case.
     * throttleTime keeps writes from thrashing localStorage.
     */
    throttleTime: 1000,
});

/** Max age for persisted cache (24h). After this, cache is discarded. */
export const PERSIST_MAX_AGE = 24 * HOUR;

/**
 * Cache buster: tied to the app version.
 * When we deploy a new version, all old cached data is discarded.
 */
export const CACHE_BUSTER = '1.0.0';

// ── Utilities ───────────────────────────────

/**
 * Role-specific localStorage keys.
 * Each role's UI state (nav open/closed, selected tabs, etc.) is stored
 * under a unique key so they never bleed into each other.
 */
export const ROLE_NAV_STORAGE_KEYS = [
    'app_nav_state_student',
    'app_nav_state_teacher',
    'app_nav_state_admin',
] as const;

/**
 * Remove all role-specific localStorage keys.
 * Call on login (clear prev session) and logout.
 */
export function clearRoleLocalStorage() {
    if (typeof window === 'undefined') return;
    ROLE_NAV_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

/**
 * Clear ALL cached data (in-memory + localStorage).
 * Call this on logout to prevent data leaking between users.
 */
export function clearQueryCache() {
    queryClient.clear();
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('ayman-academy-cache');
    }
    clearRoleLocalStorage();
}
