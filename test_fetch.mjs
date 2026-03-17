const supabaseUrl = "https://lkdbinrwojvrchunzqfq.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTE5NDUsImV4cCI6MjA4NTEyNzk0NX0.fuL0RfF2t8GneVQtoDk2ke_Ac7t-PAqXZkfr0FvLJnI";

const url = `${supabaseUrl}/rest/v1/lessons?select=*,subject:subjects(*,stage:stages(*)),sections:lesson_sections(*),blocks:lesson_blocks(*)&id=eq.b2aa3474-93b9-4db5-b62c-7c646d42062b`;

async function test() {
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });
  
  const text = await response.text();
  console.log("STATUS:", response.status);
  console.log("BODY:", text);
}

test();
