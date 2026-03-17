
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

async function verify() {
    console.log('--- Verifying Homepage Featured Tables ---');

    const tables = ['home_featured_subjects', 'home_featured_lessons'];
    let success = true;

    for (const table of tables) {
        console.log(`Checking table: ${table}...`);
        const { error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Verification FAILED for ${table}:`, error.message);
            success = false;
        } else {
            console.log(`Verification SUCCESS: Table ${table} exists and is accessible.`);
        }
    }

    if (!success) {
        process.exit(1);
    }
}

verify();
