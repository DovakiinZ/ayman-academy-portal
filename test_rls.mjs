import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[match[1].trim()] = val;
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];
const serviceKey = envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'];

const lessonId = 'b2aa3474-93b9-4db5-b62c-7c646d42062b';
const url = `${supabaseUrl}/rest/v1/lessons?select=*&id=eq.${lessonId}`;

async function test() {
  console.log("=== ADMIN TEST ===");
  const adminRes = await fetch(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${serviceKey}` }
  });
  console.log("Admin Status:", adminRes.status);
  console.log("Admin Data:", await adminRes.text());

  console.log("\n=== ANON TEST ===");
  const anonRes = await fetch(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  });
  console.log("Anon Status:", anonRes.status);
  console.log("Anon Data:", await anonRes.text());
}

test();
