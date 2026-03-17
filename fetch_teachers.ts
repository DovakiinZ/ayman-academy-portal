import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://lkdbinrwojvrchunzqfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU1MTk0NSwiZXhwIjoyMDg1MTI3OTQ1fQ.lRXFxyhFIENlb6mRewI229WZ1LKrmjEDlhzyHhlHp3A';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

import fs from 'fs';

async function fetchTeachers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher');

    if (error) {
        console.error(error);
    } else {
        fs.writeFileSync('teachers.json', JSON.stringify(data, null, 2), 'utf8');
        console.log('Saved to teachers.json');
    }
}

fetchTeachers();
