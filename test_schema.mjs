import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = "https://lkdbinrwojvrchunzqfq.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU1MTk0NSwiZXhwIjoyMDg1MTI3OTQ1fQ.lRXFxyhFIENlb6mRewI229WZ1LKrmjEDlhzyHhlHp3A";

async function run() {
    const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceKey }});
    const schema = await res.json();
    
    fs.writeFileSync('schema.json', JSON.stringify(schema, null, 2));
    console.log("Schema saved to schema.json");
}

run().catch(console.error);
