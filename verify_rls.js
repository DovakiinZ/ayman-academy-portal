
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyRLS() {
    console.log('--- Verifying Homepage RLS Policies ---');

    // Test public read (without auth)
    const publicClient = createClient(supabaseUrl, env.VITE_SUPABASE_ANON_KEY);

    const { data: subData, error: subError } = await publicClient.from('home_featured_subjects').select('*').limit(1);
    if (subError) console.error('Public read FAILED for home_featured_subjects:', subError.message);
    else console.log('Public read SUCCESS for home_featured_subjects');

    const { data: lesData, error: lesError } = await publicClient.from('home_featured_lessons').select('*').limit(1);
    if (lesError) console.error('Public read FAILED for home_featured_lessons:', lesError.message);
    else console.log('Public read SUCCESS for home_featured_lessons');
}

verifyRLS();
