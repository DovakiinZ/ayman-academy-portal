import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const lessonId = 'b2aa3474-93b9-4db5-b62c-7c646d42062b'; 

async function run() {
    console.log("=== ADMIN TEST ===");
    const { data: adminData, error: adminErr } = await supabaseAdmin
        .from('lessons')
        .select('*')
        .eq('id', lessonId);
    console.log("Admin Data:", adminData?.length);
    if(adminErr) console.error("Admin Error:", adminErr);

    console.log("\n=== PUBLIC/ANON TEST ===");
    const { data: anonData, error: anonErr } = await supabaseAnon
        .from('lessons')
        .select('*')
        .eq('id', lessonId);
    console.log("Anon Data:", anonData?.length);
    if(anonErr) console.error("Anon Error:", anonErr);
}

run();
