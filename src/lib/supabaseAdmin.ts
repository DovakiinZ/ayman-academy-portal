import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('Missing Supabase Service Role Key. Admin features like manual teacher creation will not work until VITE_SUPABASE_SERVICE_ROLE_KEY is added to .env');
}

// Admin client for use with auth.admin
// WARNING: Using this in the frontend exposes the service role key.
// Only use this in restricted admin interfaces or ideally move to edge functions.
let adminInstance: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseAdmin = () => {
    if (adminInstance) return adminInstance;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase Service Role Key is required for admin operations.');
    }

    adminInstance = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    return adminInstance;
};
