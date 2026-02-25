
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

async function verifyDetailedSchema() {
    console.log('--- Verifying Subjects & Lessons Detailed Schema ---');

    // Check subjects table for show_on_home etc
    const { error: subErr } = await supabase.from('subjects').select('show_on_home, home_order, teaser_ar, teaser_en').limit(1);
    if (subErr) console.error('Subjects table missing columns:', subErr.message);
    else console.log('Subjects table columns verified');

    // Check lessons table for show_on_home etc
    const { error: lesErr } = await supabase.from('lessons').select('show_on_home, home_order, teaser_ar, teaser_en').limit(1);
    if (lesErr) console.error('Lessons table missing columns:', lesErr.message);
    else console.log('Lessons table columns verified');
}

verifyDetailedSchema();
