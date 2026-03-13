const url = "https://lkdbinrwojvrchunzqfq.supabase.co/rest/v1/lesson_sections?select=*&limit=1";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTE5NDUsImV4cCI6MjA4NTEyNzk0NX0.fuL0RfF2t8GneVQtoDk2ke_Ac7t-PAqXZkfr0FvLJnI";

fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } })
  .then(res => res.text().then(text => console.log(res.status, text)))
  .catch(console.error);
