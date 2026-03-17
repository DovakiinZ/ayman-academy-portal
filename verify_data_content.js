
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

async function verifyDataContent() {
    console.log('--- Verifying Homepage Featured Data ---');

    const tables = ['home_featured_subjects', 'home_featured_lessons'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) console.error(`Error counting ${table}:`, error.message);
        else console.log(`Table ${table} has ${count} records.`);
    }

    // Check if stages are visible on home
    const { count: stageCount, error: stageErr } = await supabase.from('stages').select('*', { count: 'exact', head: true }).eq('show_on_home', true);
    console.log(`Visible stages on home: ${stageCount}`);

    // Check if teachers are visible on home
    const { count: teacherCount, error: teacherErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher').eq('show_on_home', true);
    console.log(`Visible teachers on home: ${teacherCount}`);
}

verifyDataContent();
