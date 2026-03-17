
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

async function checkRelationships() {
    console.log('--- Checking Subjects -> Levels Relationship ---');
    try {
        const { data, error } = await supabase
            .from('subjects')
            .select('*, levels(id, title_ar)')
            .limit(1);

        if (error) {
            console.error('Relationship check failed (levels):', error.message);
        } else {
            console.log('Relationship check success (levels):', data);
        }

        console.log('\n--- Checking column names in subjects (alternative) ---');
        // We can't easily get column names if there's no data, 
        // but we can try to guess by selecting common ones.
        const { error: err1 } = await supabase.from('subjects').select('stage_id').limit(1);
        console.log('Has stage_id?', !err1);
        if (err1) console.log('stage_id error:', err1.message);

        const { error: err2 } = await supabase.from('subjects').select('level_id').limit(1);
        console.log('Has level_id?', !err2);
        if (err2) console.log('level_id error:', err2.message);

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkRelationships();
