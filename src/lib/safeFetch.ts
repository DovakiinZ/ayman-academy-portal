/**
 * Safe fetch helper with timeout, fallback, and caching
 * Prevents navigation freezing and ensures data always displays
 */

// ============================================
// TYPES
// ============================================

export interface SafeFetchResult<T> {
    data: T;
    source: 'supabase' | 'cache' | 'dummy';
    error?: string;
    isStale?: boolean;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    source: 'supabase' | 'dummy';
}

// ============================================
// CACHE
// ============================================

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export function getCached<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isStale = age > CACHE_TTL;

    return { data: entry.data, isStale };
}

export function setCache<T>(key: string, data: T, source: 'supabase' | 'dummy'): void {
    cache.set(key, { data, timestamp: Date.now(), source });
}

export function clearCache(keyPrefix?: string): void {
    if (keyPrefix) {
        for (const key of cache.keys()) {
            if (key.startsWith(keyPrefix)) {
                cache.delete(key);
            }
        }
    } else {
        cache.clear();
    }
}

// ============================================
// SAFE FETCH
// ============================================

/**
 * Safely fetch data with timeout and fallback
 * @param queryFn - Async function that returns { data, error }
 * @param fallbackData - Data to return if query fails or is empty
 * @param cacheKey - Key for caching (optional)
 * @param timeoutMs - Timeout in milliseconds (default: 3000)
 */
export async function safeFetch<T>(
    queryFn: (signal: AbortSignal) => Promise<{ data: T | null; error: { message: string } | null }>,
    fallbackData: T,
    cacheKey?: string,
    timeoutMs: number = 3000
): Promise<SafeFetchResult<T>> {
    // Check cache first
    if (cacheKey) {
        const cached = getCached<T>(cacheKey);
        if (cached && !cached.isStale) {
            return { data: cached.data, source: 'cache' };
        }
        // Return stale cache immediately, will refresh in background
        if (cached) {
            // Fire and forget background refresh
            safeFetchInternal(queryFn, fallbackData, cacheKey, timeoutMs);
            return { data: cached.data, source: 'cache', isStale: true };
        }
    }

    return safeFetchInternal(queryFn, fallbackData, cacheKey, timeoutMs);
}

async function safeFetchInternal<T>(
    queryFn: (signal: AbortSignal) => Promise<{ data: T | null; error: { message: string } | null }>,
    fallbackData: T,
    cacheKey?: string,
    timeoutMs: number = 3000
): Promise<SafeFetchResult<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const { data, error } = await queryFn(controller.signal);
        clearTimeout(timeoutId);

        if (error) {
            console.warn('[safeFetch] Query error:', error.message);
            if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
            return { data: fallbackData, source: 'dummy', error: error.message };
        }

        // Check if data is empty
        const isEmpty = data === null ||
            (Array.isArray(data) && data.length === 0) ||
            (typeof data === 'object' && Object.keys(data as object).length === 0);

        if (isEmpty) {
            console.log('[safeFetch] Empty result, using fallback');
            if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
            return { data: fallbackData, source: 'dummy' };
        }

        // Success with data
        if (cacheKey) setCache(cacheKey, data, 'supabase');
        return { data: data as T, source: 'supabase' };
    } catch (err) {
        clearTimeout(timeoutId);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        if (errorMessage.includes('aborted')) {
            console.warn('[safeFetch] Request timeout');
            if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
            return { data: fallbackData, source: 'dummy', error: 'Request timeout' };
        }

        console.error('[safeFetch] Exception:', errorMessage);
        if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
        return { data: fallbackData, source: 'dummy', error: errorMessage };
    }
}

// ============================================
// SAFE FETCH WITHOUT SIGNAL (for legacy queries)
// ============================================

/**
 * Simplified safe fetch for queries that don't support AbortSignal
 */
export async function safeFetchSimple<T>(
    queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
    fallbackData: T,
    cacheKey?: string,
    timeoutMs: number = 3000
): Promise<SafeFetchResult<T>> {
    // Check cache first
    if (cacheKey) {
        const cached = getCached<T>(cacheKey);
        if (cached && !cached.isStale) {
            return { data: cached.data, source: 'cache' };
        }
        if (cached) {
            // Return stale cache, refresh in background
            safeFetchSimpleInternal(queryFn, fallbackData, cacheKey, timeoutMs);
            return { data: cached.data, source: 'cache', isStale: true };
        }
    }

    return safeFetchSimpleInternal(queryFn, fallbackData, cacheKey, timeoutMs);
}

async function safeFetchSimpleInternal<T>(
    queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
    fallbackData: T,
    cacheKey?: string,
    timeoutMs: number = 3000
): Promise<SafeFetchResult<T>> {
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        });

        const { data, error } = await Promise.race([queryFn(), timeoutPromise]);

        if (error) {
            console.warn('[safeFetchSimple] Query error:', error.message);
            if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
            return { data: fallbackData, source: 'dummy', error: error.message };
        }

        const isEmpty = data === null ||
            (Array.isArray(data) && data.length === 0) ||
            (typeof data === 'object' && Object.keys(data as object).length === 0);

        if (isEmpty) {
            console.log('[safeFetchSimple] Empty result, using fallback');
            if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
            return { data: fallbackData, source: 'dummy' };
        }

        if (cacheKey) setCache(cacheKey, data, 'supabase');
        return { data: data as T, source: 'supabase' };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[safeFetchSimple] Exception:', errorMessage);
        if (cacheKey) setCache(cacheKey, fallbackData, 'dummy');
        return { data: fallbackData, source: 'dummy', error: errorMessage };
    }
}
