import { supabase } from '@/lib/supabase';

/**
 * Client for the `admin-user-ops` Edge Function.
 *
 * This replaces `src/lib/supabaseAdmin.ts`, which built a Supabase client in the
 * browser using the `service_role` key from `VITE_SUPABASE_SERVICE_ROLE_KEY`.
 * Vite inlines every `VITE_`-prefixed variable into the bundle, so that approach
 * published a key that bypasses all RLS to anyone who opened DevTools.
 *
 * **Do not reintroduce a browser-side service_role client.** Any new privileged
 * operation belongs in the Edge Function next to these two.
 *
 * The caller's session token rides along automatically — `functions.invoke`
 * attaches the current `Authorization` header — and the function rejects anyone
 * who is not a `super_admin`.
 */

export interface AdminOpResult {
  success: boolean;
  error?: string;
  /** `email_exists` lets the caller show a friendly duplicate message. */
  code?: string;
  userId?: string;
  email?: string;
  /** set_password only: true when a missing auth account had to be created. */
  created?: boolean;
}

/**
 * `functions.invoke` throws on a non-2xx status and puts the body out of easy
 * reach, so unwrap it into a plain result. A 403 from a non-admin and a 409 from
 * a duplicate email are both normal outcomes the UI should render, not crashes.
 */
async function invoke(body: Record<string, unknown>): Promise<AdminOpResult> {
  const { data, error } = await supabase.functions.invoke<AdminOpResult>(
    'admin-user-ops',
    { body },
  );

  if (error) {
    // FunctionsHttpError carries the Response; read the JSON the function sent.
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === 'function') {
      try {
        const parsed = (await res.json()) as AdminOpResult;
        if (parsed && typeof parsed.success === 'boolean') return parsed;
      } catch {
        // fall through to the generic message
      }
    }
    return { success: false, error: error.message ?? 'Request failed' };
  }

  return data ?? { success: false, error: 'Empty response' };
}

/** Creates the auth account for a teacher. Omit `password` to generate one. */
export function adminCreateUser(args: {
  email: string;
  fullName: string;
  password?: string;
  role?: 'teacher' | 'student';
}): Promise<AdminOpResult> {
  return invoke({ action: 'create_user', ...args });
}

/**
 * Sets a user's password.
 *
 * Pass `email` and `fullName` as well: some teacher rows are "shadow" profiles
 * with no auth account behind them, and the function will create the account
 * with this password rather than failing with "user not found".
 */
export function adminSetPassword(args: {
  userId: string;
  password: string;
  email?: string;
  fullName?: string;
  role?: 'teacher' | 'student';
}): Promise<AdminOpResult> {
  return invoke({ action: 'set_password', ...args });
}
